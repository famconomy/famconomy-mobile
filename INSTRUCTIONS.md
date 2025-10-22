# FamConomy Project Instructions

## Overview
FamConomy is a full-stack family finance management application. It consists of a React + Vite frontend and a Node.js + Express + Prisma backend. The project helps families manage budgets, tasks, events, messaging, and more.

## Repository Structure
- `apps/web/` — Frontend (React, Vite, TypeScript)
- `apps/api/` — Backend (Node.js, Express, TypeScript, Prisma)
- `packages/` — Shared libraries (to be populated as cross-platform work begins)

## Setup Instructions

### 1. Clone the Project
```
git clone <your-repo-url>
cd FamConomy
```

### 2. Install Dependencies
Install all workspace dependencies from the repository root:
```
npm install
```

### 3. Environment Variables
- Copy `.env.example` to `.env` in both `apps/web` and `apps/api`.
- Fill in required values (API URLs, DB credentials, OAuth keys, etc.)

### 4. Database Setup (Backend)
- Ensure MySQL is running.
- Update `prisma/schema.prisma` as needed.
- Run:
```
npx prisma db push
npx prisma generate
npx prisma db seed # optional
```

### 5. Running the Project
#### Frontend
```
npm run web:dev
```
#### Backend
```
npm run api:dev
```

## Next Steps (from TODOs)
- Add validation logic in backend services (`linzService.ts`, `instacartService.ts`).
- Replace mock Instacart API calls with real endpoints.
- Implement scaling logic in `shoppingListController.ts`.

## Contributing
See `CONTRIBUTING.md` for guidelines.

## License
MIT
