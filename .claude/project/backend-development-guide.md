# Backend Development Rules

## Entity Pattern
```java
@Entity
@Getter @Setter @NoArgsConstructor
@Builder @AllArgsConstructor
public class Example {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // fields...

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;  // soft delete

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```
- Use `@Getter/@Setter`, NOT `@Data` (avoid equals/hashCode issues with JPA)
- Soft delete: `deletedAt` column, filter with `...AndDeletedAtIsNull` in queries
- Composite keys: `@IdClass` with separate Serializable class (e.g., UserTodoId)

## DTO Pattern
```java
@Getter @Builder
public class ExampleDto {
    private Long id;
    // fields...

    public static ExampleDto fromEntity(Example entity) {
        return ExampleDto.builder()
            .id(entity.getId())
            .build();
    }
}
```

## Controller Pattern
```java
@RestController
@RequestMapping("/api/example")
@RequiredArgsConstructor
public class ExampleController {
    private final ExampleService exampleService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public ResponseEntity<?> getAll(@RequestHeader("Authorization") String token) {
        Long userId = getUserIdFromToken(token);
        // ...
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", result);
        return ResponseEntity.ok(response);
    }

    private Long getUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtUtil.getUserIdFromToken(jwt);
    }
}
```
- Response format: HashMap with `success`, `message`, `data` keys
- JWT extraction: manual via `getUserIdFromToken()` helper method

## Service Pattern
```java
@Service
@RequiredArgsConstructor
public class ExampleService {
    private final ExampleRepository exampleRepository;

    @Transactional(readOnly = true)
    public ExampleDto getById(Long id) { ... }

    @Transactional
    public ExampleDto create(CreateDto dto) { ... }
}
```

## Repository Pattern
```java
public interface ExampleRepository extends JpaRepository<Example, Long> {
    Optional<Example> findByIdAndDeletedAtIsNull(Long id);
    List<Example> findByUserIdAndDeletedAtIsNull(Long userId);
}
```
- Always filter by `deletedAtIsNull` for soft-delete entities

## Build Command
```bash
export JAVA_HOME="/c/Users/laeti/.jdks/ms-21.0.9"
cd /d/Mobinogi/mobinogi-web
./mvnw clean compile -DskipTests -q
```
- JAVA_HOME must be set manually (not in system env)
