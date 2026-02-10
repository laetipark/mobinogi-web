# Backend Development Rules

## Entity
- `@Getter @Setter @NoArgsConstructor` + `@Builder @AllArgsConstructor`
- `@Getter/@Setter` 사용, `@Data` 금지 (JPA equals/hashCode 문제)
- Soft delete: `deletedAt` 컬럼, 쿼리에서 `...AndDeletedAtIsNull` 필터
- Timestamp: `@PrePersist`/`@PreUpdate`로 `createdAt`/`updatedAt` 관리
- Composite key: `@IdClass` + Serializable 클래스 (e.g., `UserTodoId`)

## DTO
- `@Getter @Builder`
- `static fromEntity()` 팩토리 메서드

## Controller
- `@RestController` + `@RequiredArgsConstructor`
- 응답: `HashMap<String, Object>` — `success`, `message`, `data` 키
- JWT: `getUserIdFromToken()` 헬퍼로 수동 추출

## Service
- `@Service` + `@RequiredArgsConstructor`
- 읽기: `@Transactional(readOnly = true)`, 쓰기: `@Transactional`

## Repository
- `JpaRepository<Entity, Id>` 상속
- Soft-delete 엔티티는 항상 `deletedAtIsNull` 조건 포함

## Build
- `JAVA_HOME` 수동 설정 필요 (시스템 env에 없음)
