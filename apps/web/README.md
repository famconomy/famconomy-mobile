# FamConomy Frontend

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Introduction

FamConomy is a family finance management application designed to help families track expenses, manage budgets, assign tasks (gigs), and communicate effectively. This repository contains the frontend application, built with React and Vite, providing a responsive and intuitive user interface.

## Features

- **User Authentication**: Secure login and registration with email/password and OAuth (Google, Facebook, Apple, Microsoft).
- **Dashboard**: Overview of family activities, pending tasks, upcoming events, and quick actions.
- **Family Management**: Create and manage family circles, invite members, and assign roles.
- **Calendar**: Schedule and track family events.
- **Tasks/Gigs Management**: Assign and track chores and tasks with rewards.
- **Budgeting & Finance**: Monitor family budgets, track transactions, and set savings goals.
- **Journaling**: Private and shared journal entries for family members.
- **Messaging**: Real-time chat with family members.
- **Shopping Lists**: Create and manage shopping lists with item tracking.
- **Notifications**: Real-time notifications for important updates.
- **Responsive Design**: Optimized for various screen sizes (desktop, tablet, mobile).
- **PWA Support**: Installable as a Progressive Web App for a native-like experience.

## Technologies Used

- **React**: A JavaScript library for building user interfaces.
- **Vite**: A fast build tool that provides a lightning-fast development experience.
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
- **React Router DOM**: Declarative routing for React.
- **Axios**: Promise-based HTTP client for the browser and Node.js.
- **date-fns**: A modern JavaScript date utility library.
- **Framer Motion**: A production-ready motion library for React.
- **Lucide React**: A beautiful and customizable icon library.
- **React Chart.js 2**: React wrapper for Chart.js for data visualization.
- **React Draggable**: A React component for making elements draggable.
- **React Hook Form**: Performant, flexible and extensible forms with easy-to-use validation.
- **React Joyride**: Create guided tours for your React apps.
- **React Plaid Link**: React component for Plaid Link integration.
- **React Toastify**: React notification library.
- **Socket.IO Client**: Real-time bidirectional event-based communication.
- **Zustand**: A small, fast and scalable bearbones state-management solution.

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18 or higher)
- npm or Yarn

### Installation

1.  **Clone the repository and install workspace dependencies:**
    ```bash
    git clone https://github.com/your-username/famconomy.git
    cd famconomy
    npm install
    ```

2.  **Navigate to the web app workspace:**
    ```bash
    cd apps/web
    ```

3.  **Create a `.env` file:**
    Create a `.env` file in the root of the `apps/web` directory and add the following environment variables. These should match your backend configuration.
    ```
    VITE_API_BASE_URL=http://localhost:3000
    # Leave unset to default to /api relative proxying when frontend and backend share a host
    VITE_SUPABASE_URL=YOUR_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

### Running the Project

To start the development server:

From the repository root:

```bash
npm run web:dev
```

Or, if you stay inside `apps/web`:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Project Structure

```
apps/web/
├── public/
│   ├── manifest.json
│   └── service-worker.js
├── src/
│   ├── api/             # API client modules for interacting with the backend
│   ├── components/      # Reusable UI components
│   │   ├── auth/        # Authentication-related components
│   │   ├── dashboard/   # Dashboard-specific components
│   │   ├── family/      # Family management components
│   │   ├── gigs/        # Gig/task related components
│   │   ├── layout/      # Layout components (Header, Sidebar, MainLayout)
│   │   ├── tasks/       # Task-specific components
│   │   └── ui/          # Generic UI components (buttons, spinners, etc.)
│   ├── hooks/           # Custom React hooks for shared logic
│   ├── pages/           # Top-level components representing different views/pages
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component and routing setup
│   ├── index.css        # Global styles and Tailwind CSS imports
│   └── main.tsx         # Entry point for the React application
├── .env                 # Environment variables
├── .gitignore           # Specifies intentionally untracked files to ignore
├── .htaccess            # Apache configuration file (if deployed on Apache)
├── eslint.config.js     # ESLint configuration
├── index.html           # Main HTML file
├── Logo.png             # Application logo
├── netlify.toml         # Netlify deployment configuration
├── package.json         # Project metadata and dependencies
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── tsconfig.app.json    # TypeScript configuration for the application
├── tsconfig.node.json   # TypeScript configuration for Node.js environment
└── vite.config.ts       # Vite build configuration
```

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
