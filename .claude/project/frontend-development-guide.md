# Frontend Development Rules

## Styling: SCSS Modules (NOT Tailwind)
```tsx
import styles from './example.module.scss';

const Example = () => (
    <div className={styles.container}>
        <h1 className={styles.title}>Title</h1>
    </div>
);
```
- Every component gets a `.module.scss` file
- Use CSS Modules scoped class names
- NO Tailwind, NO CSS-in-JS

## Path Aliases (tsconfig.app.json + vite.config.ts)
```typescript
import { SomeComponent } from '@/components/common/SomeComponent';
import { apiService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/types/user';
```
Available: `@/components`, `@/pages`, `@/services`, `@/hooks`, `@/contexts`, `@/types`, `@/config`, `@/utils`, `@/styles`

## API Service Pattern
```typescript
// services/example-service.ts
import { apiService } from './api';

export const exampleService = {
    getAll: () => apiService.get<ExampleDto[]>('/api/example'),
    getById: (id: number) => apiService.get<ExampleDto>(`/api/example/${id}`),
    create: (data: CreateDto) => apiService.post<ExampleDto>('/api/example', data),
};
```
- Wrap all API calls with `apiService` (centralized axios wrapper)
- Response shape: `{ success: boolean, data: T, message?: string }`
- **Must export new services from `services/index.ts`**

## Component Pattern
```tsx
interface ExampleProps {
    data: ExampleDto;
    onAction?: (id: number) => void;
}

const Example: React.FC<ExampleProps> = ({ data, onAction }) => {
    // hooks first
    const { user } = useAuth();
    const [state, setState] = useState<string>('');

    // handlers
    const handleClick = () => { ... };

    // render
    return ( ... );
};

export default Example;
```

## State Management
- Global auth: `AuthContext` + `useAuth()` hook
- Persistence: `localStorage` for JWT token and user data
- No Redux/Zustand - Context API only

## Auth Flow (Frontend Side)
1. Kakao SDK login -> get Kakao user info
2. Call `POST /api/auth/kakao` with user info
3. Store JWT in `localStorage.setItem("accessToken", token)`
4. Axios interceptor auto-attaches `Authorization: Bearer <token>`
5. Route guards: `PublicRoute`, `PrivateRoute`, `RegisterNicknameRoute`

## Build Commands
```bash
cd /d/Mobinogi/mobinogi-web/frontend
npm install          # Install deps
npm run dev          # Dev server on :3000
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Conventions
- File naming: kebab-case (e.g., `daily-task-section.tsx`, `game-item-card.module.scss`)
- Icons: Lucide React (`lucide-react`)
- Markdown rendering: `react-markdown`
- Commit messages: Korean, prefixed (`feat:`, `fix:`, `update:`, `refactor:`)
