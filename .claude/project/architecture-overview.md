# Mobinogi Web - Architecture Overview

## 📋 Project Summary
**Mobinogi Web** is a full-stack web application built with Spring Boot 3.4.5 and React 18, featuring OAuth2 authentication, MySQL database integration, and modern web development practices.

## 🏗 Architecture Overview

### Technology Stack
```
Frontend (React 18)    ←→    Backend (Spring Boot 3.4.5)    ←→    Database (MySQL)
     ↓                              ↓                                ↓
- TypeScript              - Java 21                         - JPA/Hibernate
- Vite Build              - Spring Security                 - Connection Pooling
- React Router            - OAuth2 Integration              - Migration Scripts
- Axios HTTP Client       - Maven Build                     - Entity Relationships
- Lucide Icons            - WAR Deployment                  - Query Optimization
```

### Project Structure
```
mobinogi-web/
├── .claude/                    # Claude AI project rules
│   ├── project/               # Public project documentation
│   └── local/                 # Private/sensitive configuration (gitignored)
├── .git/                       # Git repository
├── .gitignore                  # Git ignore rules
├── docker-compose.yml          # Docker orchestration
├── pom.xml                     # Maven build configuration
├── setup-domains.sh            # Domain setup script
├── nginx/                      # Nginx proxy configuration
├── frontend/                   # React frontend application
│   ├── src/                   # Source code
│   ├── dist/                  # Build output (gitignored)
│   ├── package.json           # Node.js dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── tsconfig.json          # TypeScript configuration
├── src/                       # Spring Boot backend
│   ├── main/
│   │   ├── java/com/example/mobinogi/    # Java source code
│   │   ├── resources/                    # Configuration files
│   │   └── webapp/                       # Web application resources
│   └── test/                  # Test sources
└── target/                    # Maven build output (gitignored)
```

## 🔄 Development Workflow

### 1. Full-Stack Development Cycle
```
1. Define API Contract (OpenAPI/Swagger)
2. Create Backend Entities & DTOs
3. Implement Backend Services & Controllers
4. Define Frontend Types & Interfaces
5. Create Frontend Components & Services
6. Implement Frontend-Backend Integration
7. Test End-to-End Functionality
8. Deploy & Monitor
```

### 2. Git Workflow
```bash
# Feature development
git checkout -b feature/user-management
git add .
git commit -m "feat: add user management functionality"
git push origin feature/user-management

# Code review and merge
# Create pull request → Review → Merge to main
```

### 3. Build & Deployment Process
```bash
# Local development
mvn spring-boot:run              # Start backend
cd frontend && npm run dev       # Start frontend

# Production build
mvn clean package                # Builds both frontend and backend
docker-compose up -d             # Deploy with containers
```

## 🚀 Quick Start Commands

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd mobinogi-web

# Backend setup
mvn clean install

# Frontend setup
cd frontend
npm install
cd ..

# Start development servers
mvn spring-boot:run &          # Backend on :8080
cd frontend && npm run dev &   # Frontend on :3000
```

### Daily Development
```bash
# Pull latest changes
git pull origin main

# Start both servers
mvn spring-boot:run &
cd frontend && npm run dev &

# Run tests
mvn test                       # Backend tests
cd frontend && npm run test    # Frontend tests (if configured)
```

### Production Deployment
```bash
# Build and deploy
mvn clean package              # Creates WAR with frontend assets
docker-compose up -d           # Deploy with Docker
```

## 🔍 Key Integration Points

### 1. Frontend-Backend Communication
```typescript
// Frontend API calls
const response = await axios.get('/api/users', {
  headers: { Authorization: `Bearer ${token}` }
});

// Backend CORS configuration
@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class UserController { /* ... */ }
```

### 2. Authentication Flow
```
1. User clicks "Login with Google" → Frontend redirects to Google OAuth
2. Google redirects back with auth code → Backend handles OAuth callback
3. Backend validates with Google → Creates/updates user in database
4. Backend returns JWT token → Frontend stores token
5. Frontend includes token in API requests → Backend validates JWT
```

### 3. Build Integration
```xml
<!-- Maven frontend plugin in pom.xml -->
<plugin>
    <groupId>com.github.eirslett</groupId>
    <artifactId>frontend-maven-plugin</artifactId>
    <executions>
        <execution>
            <id>npm run build</id>
            <goals><goal>npm</goal></goals>
            <configuration>
                <arguments>run build</arguments>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## 📊 Monitoring & Debugging

### Backend Monitoring
- Spring Boot Actuator endpoints (`/actuator/health`, `/actuator/metrics`)
- Application logs in `logs/` directory
- Database connection monitoring
- JVM metrics and performance

### Frontend Monitoring
- React Developer Tools browser extension
- Vite dev server hot reload
- Console logging and error tracking
- Performance profiling with React Profiler

### Full-Stack Debugging
```bash
# Backend debugging
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# Frontend debugging
npm run dev    # Built-in source maps and hot reload

# Database debugging
# Check MySQL logs and query performance
SHOW PROCESSLIST;
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

## 📋 Maintenance Checklist

### Daily
- [ ] Pull latest changes from main branch
- [ ] Run local tests before committing
- [ ] Check application logs for errors
- [ ] Verify both frontend and backend are running

### Weekly
- [ ] Update dependencies (npm audit, mvn versions:display-dependency-updates)
- [ ] Review and merge pending pull requests
- [ ] Clean up Docker containers and images
- [ ] Backup database if in production

### Monthly
- [ ] Security audit of dependencies
- [ ] Performance review and optimization
- [ ] Documentation updates
- [ ] Code quality review and refactoring

## 🔧 Troubleshooting Guide

### Common Issues

#### Frontend Issues
```bash
# Node modules issues
rm -rf node_modules package-lock.json
npm install

# TypeScript compilation errors
npx tsc --noEmit

# Vite build issues
npm run build -- --debug
```

#### Backend Issues
```bash
# Maven dependency issues
mvn clean install -U

# Database connection issues
# Check MySQL service status
# Verify connection string in application.properties

# Spring Boot startup issues
mvn spring-boot:run -Dspring-boot.run.profiles=dev -X
```

#### Integration Issues
```bash
# CORS issues
# Verify CORS configuration in SecurityConfig
# Check frontend API base URL

# Authentication issues
# Verify OAuth2 credentials
# Check JWT token validation
# Review Spring Security configuration
```

## 📚 Additional Resources

### Documentation
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Development Tools
- IntelliJ IDEA for backend development
- VS Code for frontend development
- Postman for API testing
- MySQL Workbench for database management
- Docker Desktop for containerization

### Best Practices
- Follow the individual backend and frontend rule files
- Maintain clean git history with meaningful commits
- Write tests for critical functionality
- Keep dependencies up to date
- Document API changes and new features
- Use proper error handling throughout the stack
