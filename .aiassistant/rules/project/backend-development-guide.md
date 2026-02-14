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

## Repository Rules
- Extend `JpaRepository`.
- For soft-delete entities, include `...AndDeletedAtIsNull` conditions.
- Keep query methods readable; move complex queries to `@Query` when needed.

## Error and Logging
- Use centralized exception handling for API errors.
- Log actionable context only; do not log secrets or tokens.

## Build and Validation
- Compile: `./mvnw clean compile -DskipTests -q`
- Test: `./mvnw test`
