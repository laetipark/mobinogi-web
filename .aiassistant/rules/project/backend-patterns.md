# Backend Patterns (Project / Commit-safe)

Reusable backend implementation templates.
Use these patterns after reading `backend-development-guide.md`.

## Entity Template
```java
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExampleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

## DTO Template
```java
@Getter
@Builder
public class ExampleDto {
    private Long id;

    public static ExampleDto fromEntity(ExampleEntity entity) {
        return ExampleDto.builder()
            .id(entity.getId())
            .build();
    }
}
```

## Service Template
```java
@Service
@RequiredArgsConstructor
public class ExampleService {
    private final ExampleRepository exampleRepository;

    @Transactional(readOnly = true)
    public ExampleDto getOne(Long id) {
        // TODO: implement
        return null;
    }

    @Transactional
    public ExampleDto create(CreateExampleRequest request) {
        // TODO: implement
        return null;
    }
}
```

## Controller Response Template
```java
private Map<String, Object> success(String message, Object data) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", true);
    body.put("message", message);
    body.put("data", data);
    return body;
}
```

