---
apply: always
---

# Text Encoding Policy

## Objective
- Keep text readable in source code.
- Prevent mojibake and escaped-only literals from being introduced again.

## Encoding Rules
- Use UTF-8 when saving source files and rule documents.
- Do not re-save tracked files with legacy encodings such as CP949/EUC-KR/ANSI.
- Keep line-ending style stable for each file unless the task explicitly requires changing it.

## Edit Safety Rules
- Do not rewrite entire existing files with shell redirection commands such as `Set-Content` or `Out-File`.
- Prefer minimal patch-based edits on existing files to reduce accidental re-encoding risk.
- If terminal output shows broken text, do not paste that broken text back into source files.

## Prompt Editing Workflow (Required)
- Before prompt-driven coding in PowerShell sessions, force UTF-8 I/O:
  - `chcp 65001`
  - `[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)`
  - `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
  - `$OutputEncoding = [Console]::OutputEncoding`
- For existing tracked files, use patch-based edits only (`apply_patch` preferred).
- Use `Set-Content -Encoding utf8` only when creating new files or repairing a file that is already invalid UTF-8.
- After any forced rewrite, immediately run encoding checks from this checklist.

## Literal Rules
- Default to ASCII for identifiers/comments whenever possible.
- Do not write user-facing or domain literals as Unicode escapes (`\\uXXXX`) in Java/TypeScript/JavaScript.
- Prefer direct readable UTF-8 text literals.
- Allowed exception: protocol-level escapes, regex control characters, or binary/text conversion utilities where escaping is required.

## Refactor Rule
- Keep category/sort order logic in one place (service constants/helpers).
- Do not duplicate the same ordering logic in repository query `CASE` clauses unless DB-side sorting is strictly required.

## Validation Checklist
- Search for escaped literals: `rg -n "\\\\u[0-9a-fA-F]{4}" src frontend`
- Search for broken characters: `rg -n "占\\?" src frontend`
- Verify modified file is UTF-8 readable: `Get-Content -Path <file> -Encoding utf8`
- If a match is intentional, add a short inline comment explaining why the escape is required.

## Repository Guard Script
- Enable repository hook once:
  - `git config core.hooksPath .githooks`
- Run guard check before commit:
  - `python scripts/encoding_guard.py`
- Auto-fix safe issues (UTF-8 BOM only), then re-check:
  - `python scripts/encoding_guard.py --fix`
  - `python scripts/encoding_guard.py`
- The guard reports:
  - invalid UTF-8
  - replacement characters (`U+FFFD`)
  - hidden control characters (`Cc`, `Cf`)
  - suspicious mojibake signatures
