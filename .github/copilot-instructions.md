# FamConomy AI Coding Instructions

## Architecture Overview

FamConomy is a monorepo with two main applications:
- **Frontend** (`famconomy/`): React + Vite + TypeScript + TailwindCSS
- **Backend** (`famconomy-backend/`): Node.js + Express + Prisma + MySQL

The app is a family finance management platform with real-time features, OAuth authentication, and modular domain-driven architecture.

## Security Requirements

### Authorization Patterns
- **All backend routes must verify family membership/ownership before data access**
- Use helper functions in controllers to check user belongs to requested familyId
- Budget, task, and transaction operations require family membership validation
- Example: `await verifyFamilyMembership(userId, familyId)` before any family data access

### Authentication
- **NO client-side demo/bypass accounts in production builds**
- Use `process.env.NODE_ENV !== 'production'` for any demo features
- Backend uses JWT tokens in HttpOnly cookies (`fam_token`)
- All API routes protected by `authenticateToken` middleware

## Key Development Patterns

### API Client Pattern
All frontend API calls use the centralized `src/api/apiClient.ts` with `withCredentials: true` for cookie-based auth. Each domain has its own API module (e.g., `src/api/auth.ts`, `src/api/family.ts`).

```typescript
// Pattern: Always use the domain-specific API modules
import { getMyFamily } from '../api/family';
import { getUserTasks } from '../api/tasks';
```

### Hook-Based State Management
State is managed through custom React hooks, not external libraries:
- `useAuth()` - Authentication state and methods
- `useFamily()` - Family selection with localStorage persistence
- `useLinZChat()` - AI assistant integration
- Domain-specific hooks follow the pattern `use[Domain]()`

### Component Organization
```
src/components/
├── layout/          # MainLayout, Sidebar, Header
├── auth/            # Login, register components
├── [domain]/        # Feature-specific components
├── ui/              # Reusable UI primitives
└── modals/          # Modal components
```

### Backend Route Structure
Routes follow RESTful patterns with domain separation:
```typescript
// Pattern: /api/[domain]/[action]
app.use('/families', familyRoutes);
app.use('/tasks', taskRoutes);
app.use('/auth', authRoutes);
```

## Critical Conventions

### Authentication Flow
- Uses **HttpOnly cookies** (not localStorage tokens)
- OAuth providers: Google, Apple, Microsoft, Facebook
- Auth state checked on app initialization via `/auth/me`
- Always use `apiClient` with `withCredentials: true`

### Family Context Management
The app supports multi-family users. Active family ID is stored in localStorage and synced across tabs:
```typescript
// Always check for active family context
const { activeFamilyId, family } = useFamily();
```

### Type Definitions
Shared types are in `src/types/index.ts` with domain-specific extensions:
- User roles: `'admin' | 'parent' | 'child' | 'guardian'`
- All entities have string IDs on frontend, number IDs in Prisma schema

### AI Assistant Integration
LinZ is the family AI assistant with guided tours and chat:
- `useLinZChat()` for chat functionality
- `useOnboardingTour()` for guided experiences
- Uses OpenAI API with context-aware responses

## Development Workflow

### Frontend Development
```bash
cd famconomy
npm run dev          # Starts Vite dev server on port 5173
npm run build        # Production build
npm run lint         # ESLint check
```

### Backend Development
```bash
cd famconomy-backend
npm run dev          # Starts Express server on port 3000
npx prisma db push   # Push schema changes
npx prisma generate  # Regenerate Prisma client
```

### Database Operations
- Prisma schema is in `famconomy-backend/prisma/schema.prisma`
- Always run `npx prisma generate` after schema changes
- Seed data available via `npx prisma db seed`
- **Use single Prisma client instance from `src/db.ts` - never `new PrismaClient()`**

### Session & Environment Security
- JWT_SECRET and SESSION_SECRET are required in production
- Sessions use MemoryStore by default - use Redis/external store for production
- Sensitive data logging is disabled in production via structured logger
- Plaid tokens stored encrypted, never logged in plain text

## Integration Points

### Real-time Features
Socket.io integration for:
- Live messaging between family members
- Real-time notifications
- Assistant responses

### External Services
- **Plaid**: Bank account integration (`src/api/plaid.ts`)
- **FullCalendar**: Event management with recurring events
- **TipTap**: Rich text editor for journals
- **Framer Motion**: Page transitions and animations

### Routing & Navigation
- Uses React Router with nested layouts
- Main app routes are wrapped in `MainLayout`
- Auth pages use separate layout
- Route guards check authentication status

## Performance Considerations

- API responses are cached in component state or custom hooks
- Images are optimized via Vite's asset handling
- Bundle splitting happens automatically via Vite
- Socket.io connections are managed at the app level

## Testing & Error Handling

- Backend uses Vitest for testing
- Frontend error boundaries catch React errors
- API errors are handled consistently through `apiClient` interceptors
- Debug logging available via `createDebugLogger()` utility

When working on this codebase, prioritize understanding the family-centric data model and authentication flow before making changes to any domain-specific features.