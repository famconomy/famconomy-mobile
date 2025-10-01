# FamConomy Project Instructions

## Overview
FamConomy is a full-stack family finance management application. It consists of a React + Vite frontend and a Node.js + Express + Prisma backend. The project helps families manage budgets, tasks, events, messaging, and more.

## Repository Structure
- `famconomy/` — Frontend (React, Vite, TypeScript)
- `famconomy-backend/` — Backend (Node.js, Express, TypeScript, Prisma)
- `src/` — Additional pages/routes (legacy or migration in progress)

## Setup Instructions

### 1. Clone the Project
```
git clone <your-repo-url>
cd FamConomy
```

### 2. Install Dependencies
#### Frontend
```
cd famconomy
npm install
```
#### Backend
```
cd famconomy-backend
npm install
```

### 3. Environment Variables
- Copy `.env.example` to `.env` in both frontend and backend folders.
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
cd famconomy
npm run dev
```
#### Backend
```
cd famconomy-backend
npm run dev
```

## Next Steps (from TODOs)
- Add validation logic in backend services (`linzService.ts`, `instacartService.ts`).
- Replace mock Instacart API calls with real endpoints.
- Implement scaling logic in `shoppingListController.ts`.

## Contributing
See `CONTRIBUTING.md` for guidelines.

## License
MIT
