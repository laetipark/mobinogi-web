# Backend Development Guide

## Entity Rules
- Use explicit Lombok annotations (`@Getter`, `@Setter`, etc.) instead of `@Data`.
- Include `createdAt` and `updatedAt` lifecycle handling where needed.
- Prefer soft-delete with `deletedAt` for recoverable domains.
- Keep entity relationships explicit and avoid unnecessary eager loading.

## DTO Rules
- Keep request DTO and response DTO separate.
- Provide explicit mapping helpers such as `fromEntity(...)`.
- Do not expose internal entity fields directly to API responses.

## Controller Rules
- Use `@RestController` and constructor injection.
- Validate request payloads with bean validation annotations.
- Return a consistent response contract (`success`, `message`, `data`).
- Keep controllers thin; delegate business logic to services.

## Service Rules
- Annotate read operations with `@Transactional(readOnly = true)`.
- Annotate write operations with `@Transactional`.
- Keep domain rules and orchestration in service layer.
- Normalize and validate optional request parameters in dedicated helper methods
  (e.g. `normalizeCategory(...)`, `resolve...(...)`) instead of inline branching.
- Replace repeated branching blocks with intention-revealing private methods.

## Repository Rules
- Extend `JpaRepository`.
- For soft-delete entities, include `...AndDeletedAtIsNull` conditions.
- Keep query methods readable; move complex queries to `@Query` when needed.
- If derived query names become hard to read, prefer explicit `@Query` with
  clear method names (e.g. `findActive...`, `findActive...ByTypes`).

## Error and Logging
- Use centralized exception handling for API errors.
- Log actionable context only; do not log secrets or tokens.
- Avoid returning raw exception messages from generic `Exception` handlers.
  Return stable client-safe messages and keep details in server logs.

## Controller Readability
- Avoid `ResponseEntity<?>` when response shape is known; use explicit generic types.
- For map-based response contracts, use dedicated helper methods to build success/failure payloads
  to remove duplication and keep key ordering consistent.
- Extract repeated response keys (`success`, `message`, `data`) into one code path per controller.

## Build and Validation
- Compile: `./mvnw clean compile -DskipTests -q`
- Test: `./mvnw test`
