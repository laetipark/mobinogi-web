# Backend Development Guide - Mobinogi Web

## 📋 Backend Overview
- **Framework**: Spring Boot 3.4.5
- **Language**: Java 21
- **Build Tool**: Maven
- **Database**: MySQL with JPA/Hibernate
- **Security**: Spring Security + OAuth2
- **Package**: `com.example.mobinogi`

## 📁 Backend Structure

### Main Package Structure
```
src/main/java/com/example/mobinogi/
├── config/           # Spring configuration classes
│   ├── SecurityConfig.java      # Spring Security configuration
│   ├── OAuth2Config.java        # OAuth2 client configuration  
│   ├── DatabaseConfig.java      # Database configuration
│   └── WebConfig.java          # Web MVC configuration
├── controller/       # REST API controllers
│   ├── AuthController.java     # Authentication endpoints
│   ├── UserController.java     # User management
│   ├── ApiController.java      # General API endpoints
│   └── NewsController.java     # News-related endpoints
├── dto/             # Data Transfer Objects
│   ├── request/     # Request DTOs
│   ├── response/    # Response DTOs
│   └── common/      # Common DTOs
├── entity/          # JPA entities
│   ├── User.java    # User entity
│   ├── BaseEntity.java  # Common entity fields
│   └── ...          # Other domain entities
├── model/           # Business models
├── repository/      # JPA repositories
│   ├── UserRepository.java
│   └── ...          # Domain-specific repositories
├── service/         # Business logic services
│   ├── UserService.java
│   ├── AuthService.java
│   ├── NewsService.java
│   └── impl/        # Service implementations
├── scheduler/       # Scheduled tasks
│   └── ScheduledTasks.java
├── view/            # View-related classes
├── news/            # News-related functionality
├── MobinogiApplication.java    # Main application class
└── ServletInitializer.java    # WAR deployment initializer
```

### Resources Structure
```
src/main/resources/
├── application.properties         # Main Spring Boot configuration
├── application-dev.properties     # Development profile
├── application-prod.properties    # Production profile
├── context/                       # Application context files
├── google-oauth/                  # Google OAuth credentials (gitignored)
├── properties/                    # Custom property files (some gitignored)
├── static/                        # Static web resources (built frontend)
└── templates/                     # Server-side templates (if any)
```

## 🔧 Backend Development Guidelines

### Code Standards

#### 1. Java 21 Best Practices
```java
// Use records for DTOs
public record UserResponseDto(
    Long id,
    String email,
    String name,
    LocalDateTime createdAt
) {}

// Use text blocks for SQL queries
private static final String COMPLEX_QUERY = """
    SELECT u.id, u.email, u.name
    FROM users u
    WHERE u.active = true
      AND u.created_at > ?
    ORDER BY u.created_at DESC
    """;

// Pattern matching with instanceof
if (user instanceof AdminUser admin) {
    return admin.getAdminLevel();
}
```

#### 2. Lombok Usage
```java
@Data
@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String name;
}
```

#### 3. Spring Annotations
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Validated
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or @userService.isOwner(#id, authentication.name)")
    public ResponseEntity<UserResponseDto> getUser(@PathVariable Long id) {
        // Implementation
    }
}
```

### API Development Rules

#### 1. REST Endpoint Conventions
```http request
// Good examples
### Get all users
GET    /api/users

### Get specific user
GET    /api/users/{id}

### Create user
POST   /api/users

### Update user
PUT    /api/users/{id}

### Delete user
DELETE /api/users/{id}     

// Nested resources
### Get user's posts
GET    /api/users/{id}/posts

### Create post for user    
POST   /api/users/{id}/posts    
```

#### 2. Response Structure
```java
@Data
@Builder
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;
    
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .timestamp(LocalDateTime.now())
            .build();
    }
    
    public static ApiResponse<Void> error(String message) {
        return ApiResponse.<Void>builder()
            .success(false)
            .message(message)
            .timestamp(LocalDateTime.now())
            .build();
    }
}
```

#### 3. Error Handling
```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleEntityNotFound(EntityNotFoundException ex) {
        log.warn("Entity not found: {}", ex.getMessage());
        return ApiResponse.error(ex.getMessage());
    }
    
    @ExceptionHandler(ValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidation(ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ApiResponse.error("Validation failed: " + ex.getMessage());
    }
}
```

### Database & JPA Guidelines

#### 1. Entity Design
```java
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // Relationships
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Post> posts = new ArrayList<>();
}
```

#### 2. Repository Patterns
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    List<User> findByCreatedAtAfter(LocalDateTime date);
    
    @Query("SELECT u FROM User u WHERE u.active = true")
    List<User> findActiveUsers();
    
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :loginTime WHERE u.id = :id")
    void updateLastLogin(@Param("id") Long id, @Param("loginTime") LocalDateTime loginTime);
}
```

#### 3. Service Layer
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    
    @Transactional
    public UserResponseDto createUser(UserCreateDto createDto) {
        User user = userMapper.toEntity(createDto);
        User savedUser = userRepository.save(user);
        log.info("Created user with email: {}", savedUser.getEmail());
        return userMapper.toResponseDto(savedUser);
    }
    
    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
        return userMapper.toResponseDto(user);
    }
}
```

### Security Configuration

#### 1. OAuth2 Configuration
```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
            )
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()));
        
        return http.build();
    }
}
```

## 🛠 Backend Commands

### Maven Commands
```bash
# Compile
mvn clean compile

# Run application
mvn spring-boot:run

# Run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run tests
mvn test

# Package (includes frontend build)
mvn clean package

# Skip tests
mvn clean package -DskipTests

# Generate WAR
mvn clean package -Pproduction
```

### Testing Commands
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=UserServiceTest

# Run integration tests
mvn verify -Pfailsafe

# Generate test coverage report
mvn jacoco:report
```

## 🔍 Key Backend Files

### Configuration Files
- `pom.xml` - Maven dependencies and build configuration
- `application.properties` - Main Spring Boot settings
- `application-dev.properties` - Development environment settings
- `application-prod.properties` - Production environment settings

### Important Dependencies
```xml
<!-- Spring Boot Starters -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>

<!-- Database -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
</dependency>

<!-- Utility -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
```

## 📋 Development Checklist

### For New Features
- [ ] Create entity with proper JPA annotations
- [ ] Implement repository interface
- [ ] Create DTOs for request/response
- [ ] Implement service layer with business logic
- [ ] Create controller with REST endpoints
- [ ] Add proper error handling
- [ ] Write unit and integration tests
- [ ] Update API documentation

### Code Review Guidelines
- [ ] Proper use of Spring annotations
- [ ] Lombok usage for boilerplate reduction
- [ ] Appropriate exception handling
- [ ] Database query optimization
- [ ] Security considerations
- [ ] Transaction management
- [ ] Logging implementation
- [ ] Test coverage

## 🚀 Performance & Best Practices

### Database Optimization
- Use `@Query` for complex queries
- Implement proper indexing
- Use pagination for large datasets
- Optimize N+1 query problems
- Use `@Transactional` appropriately

### Security Best Practices
- Validate all inputs
- Use HTTPS in production
- Implement proper CORS configuration
- Secure OAuth2 configuration
- Use environment variables for secrets

### Monitoring & Logging
- Use structured logging with SLF4J
- Implement proper log levels
- Use Spring Boot Actuator for monitoring
- Add custom metrics where needed
- Monitor database connection pools
