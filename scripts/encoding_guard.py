#!/usr/bin/env python3
from __future__ import annotations

import argparse
import codecs
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

TEXT_SUFFIXES = {
	".java", ".kt", ".kts",
	".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
	".css", ".scss", ".sass", ".less",
	".html", ".htm", ".xml", ".svg",
	".json", ".jsonc",
	".md", ".txt", ".yml", ".yaml", ".toml", ".ini", ".properties",
	".sh", ".ps1", ".cmd", ".bat", ".sql", ".graphql"
}

SKIP_DIRS = {
	".git", ".idea", ".vscode",
	"node_modules", "dist", "build", "target", "coverage"
}

SUSPICIOUS_WESTERN_MOJIBAKE_RE = re.compile("(?:\u00C3.|\u00C2.|\u00E2\u20AC)")
SUSPICIOUS_QUESTION_CLUSTER_RE = re.compile(r"\?{3,}")
SUSPICIOUS_HAN_RE = re.compile(r"[\u4e00-\u9fff]")


@dataclass
class Finding:
	path: Path
	line: int
	col: int
	code: str
	message: str
	severity: str  # "error" | "warning"


def offset_to_line_col(text: str, offset: int) -> tuple[int, int]:
	line = text.count("\n", 0, offset) + 1
	last_newline = text.rfind("\n", 0, offset)
	col = offset + 1 if last_newline < 0 else offset - last_newline
	return line, col


def is_text_candidate(path: Path) -> bool:
	return path.suffix.lower() in TEXT_SUFFIXES


def iter_files_from_git(root: Path) -> list[Path]:
	cmd = [
		"git",
		"-C",
		str(root),
		"ls-files",
		"-z",
		"--cached",
		"--others",
		"--exclude-standard",
	]
	try:
		completed = subprocess.run(cmd, capture_output=True, check=True)
	except Exception:
		return []

	paths: list[Path] = []
	for rel in completed.stdout.decode("utf-8", "replace").split("\x00"):
		if not rel:
			continue
		path = (root / rel).resolve()
		if path.is_file():
			paths.append(path)
	return paths


def iter_files_by_walk(root: Path) -> list[Path]:
	paths: list[Path] = []
	for path in root.rglob("*"):
		if not path.is_file():
			continue
		if any(part in SKIP_DIRS for part in path.parts):
			continue
		paths.append(path.resolve())
	return paths


def resolve_targets(root: Path, raw_paths: list[str]) -> list[Path]:
	if raw_paths:
		targets: list[Path] = []
		for raw in raw_paths:
			candidate = (root / raw).resolve()
			if candidate.is_file():
				targets.append(candidate)
			elif candidate.is_dir():
				for file_path in candidate.rglob("*"):
					if file_path.is_file():
						targets.append(file_path.resolve())
		return targets

	git_targets = iter_files_from_git(root)
	if git_targets:
		return git_targets
	return iter_files_by_walk(root)


def scan_file(path: Path, *, fix_bom: bool, strict_suspicious: bool) -> tuple[list[Finding], bool]:
	findings: list[Finding] = []
	modified = False

	try:
		raw = path.read_bytes()
	except Exception as exc:
		findings.append(Finding(path, 1, 1, "E000", f"failed to read file: {exc}", "error"))
		return findings, modified

	if b"\x00" in raw:
		return findings, modified

	if not is_text_candidate(path):
		return findings, modified

	if raw.startswith(codecs.BOM_UTF8):
		findings.append(Finding(path, 1, 1, "W001", "UTF-8 BOM detected", "warning"))
		if fix_bom:
			raw = raw[len(codecs.BOM_UTF8):]
			modified = True

	try:
		text = raw.decode("utf-8")
	except UnicodeDecodeError as exc:
		line = raw.count(b"\n", 0, exc.start) + 1
		last_newline = raw.rfind(b"\n", 0, exc.start)
		col = exc.start + 1 if last_newline < 0 else exc.start - last_newline
		findings.append(Finding(path, line, col, "E001", f"invalid UTF-8 byte sequence: {exc.reason}", "error"))
		return findings, modified

	control_scan_start = 0
	if text.startswith("\ufeff"):
		# UTF-8 BOM at byte level appears as U+FEFF after decoding.
		# W001 already reports this case, so avoid duplicate control-character reports.
		control_scan_start = 1

	for idx in range(control_scan_start, len(text)):
		ch = text[idx]
		if ch == "\n" or ch == "\r" or ch == "\t":
			continue
		if ch == "\ufffd":
			line, col = offset_to_line_col(text, idx)
			findings.append(Finding(path, line, col, "E002", "replacement character (U+FFFD) detected", "error"))
			continue
		category = unicodedata.category(ch)
		if category in {"Cc", "Cf"}:
			line, col = offset_to_line_col(text, idx)
			findings.append(
				Finding(path, line, col, "E003", f"disallowed control character U+{ord(ch):04X}", "error")
			)

	lines = text.splitlines()
	for line_idx, line in enumerate(lines, start=1):
		match = SUSPICIOUS_WESTERN_MOJIBAKE_RE.search(line)
		if match:
			severity = "error" if strict_suspicious else "warning"
			findings.append(
				Finding(path, line_idx, match.start() + 1, "M101", "suspicious mojibake signature (western)", severity)
			)

		question_match = SUSPICIOUS_QUESTION_CLUSTER_RE.search(line)
		if question_match and SUSPICIOUS_HAN_RE.search(line):
			severity = "error" if strict_suspicious else "warning"
			findings.append(
				Finding(path, line_idx, question_match.start() + 1, "M102", "suspicious mojibake signature (han + ???)", severity)
			)

	if modified:
		path.write_bytes(raw)

	return findings, modified


def format_finding(finding: Finding) -> str:
	return f"{finding.path}:{finding.line}:{finding.col} [{finding.code}] {finding.message}"


def dedupe_findings(items: Iterable[Finding]) -> list[Finding]:
	seen: set[tuple[Path, int, int, str, str]] = set()
	result: list[Finding] = []
	for item in items:
		key = (item.path, item.line, item.col, item.code, item.message)
		if key in seen:
			continue
		seen.add(key)
		result.append(item)
	return result


def main() -> int:
	parser = argparse.ArgumentParser(description="UTF-8 and mojibake guard for repository text files.")
	parser.add_argument("paths", nargs="*", help="Optional files/directories to scan. Defaults to tracked files.")
	parser.add_argument("--root", default=".", help="Repository root path (default: current directory).")
	parser.add_argument("--fix", action="store_true", help="Apply safe fixes (currently: remove UTF-8 BOM).")
	parser.add_argument(
		"--no-strict-suspicious",
		action="store_true",
		help="Downgrade suspicious mojibake findings to warnings.",
	)
	args = parser.parse_args()

	root = Path(args.root).resolve()
	targets = resolve_targets(root, args.paths)
	if not targets:
		print("No files to scan.")
		return 0

	all_findings: list[Finding] = []
	modified_files = 0

	for path in targets:
		if any(part in SKIP_DIRS for part in path.parts):
			continue
		findings, modified = scan_file(
			path,
			fix_bom=args.fix,
			strict_suspicious=not args.no_strict_suspicious,
		)
		all_findings.extend(findings)
		if modified:
			modified_files += 1

	all_findings = dedupe_findings(all_findings)
	errors = [item for item in all_findings if item.severity == "error"]
	warnings = [item for item in all_findings if item.severity == "warning"]

	for finding in all_findings:
		print(format_finding(finding))

	print(
		f"\nScanned {len(targets)} files. "
		f"modified={modified_files}, errors={len(errors)}, warnings={len(warnings)}"
	)

	return 1 if errors else 0


if __name__ == "__main__":
	sys.exit(main())
