# AGENTS.md

## Scope
- These rules apply to all work in this repository.

## Encoding Guardrails
- Treat UTF-8 as mandatory for all source files.
- For partial edits, prefer minimal in-place patches over full-file rewrites.
- Avoid rewriting files that contain Korean text unless it is strictly necessary.
- If a full rewrite is unavoidable, preserve exact original text first and write back as UTF-8.
- After text-heavy edits, run quick checks for corruption signals (for example replacement chars or broken string literals) before building.

## Unicode Handling
- Preserve existing non-ASCII text exactly as-is unless the task explicitly requests text changes.
- Do not trust mojibake shown in terminal output as source truth by itself.
- If displayed text looks broken, verify from repository content (for example `git show HEAD:<path>`) before editing.
- Do not normalize, transliterate, or "clean up" user-facing Korean strings unless requested.

## Execution Efficiency
- Start with a short plan and batch related edits together.
- Prefer targeted validation first; run one full build at the end of a change batch.
- Avoid repeated whole-project rebuild loops after every small edit.
- Share concise progress updates at meaningful checkpoints (scan complete, edits complete, validation complete).
- When blocked, report the blocker and the exact next action immediately.

## Safe Change Practice
- Do not mix unrelated refactors with requested changes in the same pass.
- Keep behavior changes explicit and localized.
- When recovering from corruption, restore from `HEAD` first, then re-apply only requested diffs.
