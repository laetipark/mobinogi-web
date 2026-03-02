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
- Search for broken characters: `rg -n "�" src frontend`
- If a match is intentional, add a short inline comment explaining why the escape is required.
