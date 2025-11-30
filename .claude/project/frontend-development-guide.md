# Frontend Development Guide - Mobinogi Web

## 📋 Frontend Overview
- **Framework**: React 18.2.0
- **Language**: TypeScript
- **Build Tool**: Vite 5.0.0
- **Routing**: React Router DOM 6.20.1
- **HTTP Client**: Axios 1.13.2
- **UI Icons**: Lucide React 0.263.1
- **Linting**: ESLint with React plugins

## 📁 Frontend Structure

### Source Directory Structure
```
frontend/src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Modal, etc.)
│   ├── layout/         # Layout components (Header, Footer, Sidebar)
│   ├── forms/          # Form-specific components
│   └── ui/             # UI-specific components
├── pages/              # Route-based page components
│   ├── auth/           # Authentication pages (Login, Register)
│   ├── dashboard/      # Dashboard pages
│   ├── profile/        # User profile pages
│   └── home/           # Home page components
├── services/           # API service layer
│   ├── api.ts          # Axios configuration and base API
│   ├── auth.service.ts # Authentication services
│   ├── user.service.ts # User-related API calls
│   └── news.service.ts # News-related API calls
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Authentication context
│   ├── ThemeContext.tsx # Theme management
│   └── UserContext.tsx # User data context
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useApi.ts       # API calling hook
│   ├── useLocalStorage.ts # Local storage hook
│   └── useDebounce.ts  # Debouncing hook
├── types/              # TypeScript type definitions
│   ├── api.types.ts    # API response types
│   ├── user.types.ts   # User-related types
│   ├── auth.types.ts   # Authentication types
│   └── common.types.ts # Common/shared types
├── utils/              # Utility functions
│   ├── constants.ts    # Application constants
│   ├── helpers.ts      # Helper functions
│   ├── validators.ts   # Form validation functions
│   └── formatters.ts   # Data formatting functions
├── config/             # Configuration files
│   ├── env.ts          # Environment configuration
│   └── routes.ts       # Route definitions
├── assets/             # Static assets
│   ├── images/         # Image files
│   ├── icons/          # Icon files
│   ├── fonts/          # Custom fonts
│   └── styles/             # Global styles
│       ├── globals.css     # Global CSS
│       ├── variables.css   # CSS custom properties
│       └── components.css  # Component-specific styles
├── app.tsx             # Main App component
├── index.tsx           # Application entry point
└── vite-env.d.ts       # Vite environment types
```

### Configuration Files
```
frontend/
├── .env.development        # Development environment variables (gitignored)
├── .env.production        # Production environment variables (gitignored)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tsconfig.app.json      # App-specific TypeScript config
├── tsconfig.node.json     # Node.js TypeScript config
├── vite.config.ts         # Vite build configuration
├── eslint.config.js       # ESLint configuration
└── index.html             # HTML template
```

## 🔧 Frontend Development Guidelines

### Code Standards

#### 1. TypeScript Best Practices
```typescript
// Use proper type definitions
interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

// Use union types for state
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Use generic types for API responses
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Use const assertions for immutable data
const API_ENDPOINTS = {
  USERS: '/api/users',
  AUTH: '/api/auth',
  NEWS: '/api/news',
} as const;
```

#### 2. React Component Patterns
```tsx
// Functional component with TypeScript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  onEdit, 
  className = '' 
}) => {
  const handleEditClick = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);

  return (
    <div className={`user-card ${className}`}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={handleEditClick}>
          Edit
        </button>
      )}
    </div>
  );
};

export default UserCard;
```

#### 3. Custom Hooks
```typescript
// Authentication hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};

// API hook with loading states
export const useApi = <T,>(
  apiCall: () => Promise<ApiResponse<T>>
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute };
};
```

### Service Layer Architecture

#### 1. API Configuration
```typescript
// services/api.ts
import axios from 'axios';

// Use environment variables for configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### 2. Service Classes
```typescript
// services/user.service.ts
export class UserService {
  static async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await api.get<ApiResponse<User[]>>('/api/users');
    return response.data;
  }

  static async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`/api/users/${id}`);
    return response.data;
  }

  static async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/api/users', userData);
    return response.data;
  }

  static async updateUser(
    id: number, 
    userData: UpdateUserRequest
  ): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>(`/api/users/${id}`, userData);
    return response.data;
  }

  static async deleteUser(id: number): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/api/users/${id}`);
    return response.data;
  }
}
```

### State Management Patterns

#### 1. Context Providers
```tsx
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Validate token and get user data
          const userData = await AuthService.validateToken(token);
          setUser(userData);
        } catch {
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await AuthService.login(credentials);
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Routing Configuration

#### 1. Route Definitions
```tsx
// config/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  USERS: '/users',
  NEWS: '/news',
} as const;

// App routing
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route 
          path={ROUTES.LOGIN} 
          element={
            isAuthenticated ? 
            <Navigate to={ROUTES.DASHBOARD} replace /> : 
            <LoginPage />
          } 
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
```

#### 2. Protected Routes
```tsx
// components/common/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};
```

## 🛠 Frontend Commands

### Development Commands
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Development server (development mode)
npm run dev

# Development server (production mode)  
npm run dev:prod

# Build for production
npm run build

# Build for development
npm run build:dev

# Preview production build
npm run preview

# Preview production build (production mode)
npm run preview:prod

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __DEV__: mode === 'development',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production',
  },
}));
```

## 🎨 Styling Guidelines

### CSS Structure
```css
/* styles/globals.css */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  
  --font-family-sans: 'Inter', sans-serif;
  --border-radius: 0.375rem;
  --box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

/* Component styling patterns */
.btn {
  @apply px-4 py-2 rounded font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.card {
  @apply bg-white rounded-lg shadow-sm border p-6;
}
```

## 🧪 Testing Guidelines

### Component Testing
```typescript
// __tests__/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '../components/UserCard';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2023-01-01T00:00:00Z',
};

describe('UserCard', () => {
  test('renders user information correctly', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('calls onEdit when edit button is clicked', () => {
    const onEditMock = jest.fn();
    render(<UserCard user={mockUser} onEdit={onEditMock} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEditMock).toHaveBeenCalledWith(mockUser);
  });
});
```

## 📋 Development Checklist

### For New Features
- [ ] Create TypeScript types/interfaces
- [ ] Implement reusable components
- [ ] Create service functions for API calls
- [ ] Implement custom hooks if needed
- [ ] Add proper error handling
- [ ] Write component tests
- [ ] Update routing if necessary
- [ ] Add loading and error states

### Code Review Guidelines
- [ ] Proper TypeScript typing
- [ ] React best practices (hooks, lifecycle)
- [ ] Accessibility considerations
- [ ] Performance optimizations
- [ ] Error boundary implementation
- [ ] Responsive design
- [ ] Clean component structure
- [ ] Test coverage

## 🚀 Performance & Best Practices

### Performance Optimization
```typescript
// Code splitting
const LazyDashboard = React.lazy(() => import('./pages/Dashboard'));

// Memoization
const MemoizedUserCard = React.memo(UserCard);

// Debounced search
const SearchInput: React.FC = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // Perform search
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
};
```

### Accessibility Best Practices
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation
- Maintain color contrast ratios
- Add alt text for images
- Use proper heading hierarchy

### Security Considerations
- Sanitize user inputs
- Use HTTPS in production
- Implement proper CORS handling
- Validate data on both client and server
- Store sensitive data securely
- Implement proper authentication flows
