# FamConomy Backend

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Introduction

FamConomy Backend is the server-side component of the family finance management application. It provides a robust and secure API for managing users, families, tasks, budgets, transactions, and more. The backend is built with Node.js and Express, using Prisma as an ORM for database interactions.

## Features

- **User Management**: CRUD operations for user accounts.
- **Authentication**: JWT-based authentication with Google OAuth2 integration, using HttpOnly cookies for enhanced security.
- **Family Management**: Create, update, and manage family units and their members.
- **Task/Gig Management**: Define and assign tasks, track their status, and manage rewards.
- **Budgeting & Transactions**: API for managing budgets, recording transactions, and tracking savings goals.
- **Calendar Events**: Manage family events and schedules.
- **Messaging**: Real-time messaging functionality.
- **Notifications**: Push notifications for important updates.
- **Plaid Integration**: Connect to financial institutions for transaction data.
- **Feedback System**: Endpoint for users to submit feedback and bug reports.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express**: Fast, unopinionated, minimalist web framework for Node.js.
- **TypeScript**: A typed superset of JavaScript.
- **Prisma**: Next-generation ORM for Node.js and TypeScript.
- **MySQL**: Relational database.
- **bcryptjs**: Library for hashing passwords.
- **jsonwebtoken**: JSON Web Token implementation for Node.js.
- **Passport.js**: Authentication middleware for Node.js.
  - `passport-google-oauth20`: Passport strategy for authenticating with Google using OAuth 2.0.
  - `passport-apple`: Passport strategy for authenticating with Sign In with Apple.
  - `passport-microsoft`: Passport strategy for authenticating with Microsoft accounts.
  - `passport-facebook`: Passport strategy for authenticating with Facebook.
- **cors**: Node.js middleware for providing a Connect/Express middleware that can be used to enable CORS.
- **express-session**: Simple session middleware for Express.
- **cookie-parser**: Parse Cookie header and populate `req.cookies`.
- **multer**: Middleware for handling `multipart/form-data`, primarily used for uploading files.
- **socket.io**: Enables real-time, bidirectional and event-based communication.
- **dotenv**: Loads environment variables from a `.env` file.
- **web-push**: Web Push Protocol library for sending push notifications.
- **googleapis**: Google APIs client library for Node.js.
- **@plaid/plaid**: Plaid API client library.

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18 or higher)
- MySQL database
- Prisma CLI (`npm install -g prisma`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/famconomy-backend.git
    cd famconomy-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Create a `.env` file:**
    Create a `.env` file in the root of the `famconomy-backend` directory and add the following environment variables:

    ```
    DATABASE_URL="mysql://user:password@localhost:3306/famconomy"
    JWT_SECRET=your_jwt_secret_key
    SESSION_SECRET=your_session_secret_key

    # Google OAuth2
    GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
    GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

    # Facebook OAuth2
    FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
    FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
    FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

    # Apple OAuth2
    APPLE_CLIENT_ID=YOUR_APPLE_CLIENT_ID
    APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID
    APPLE_KEY_ID=YOUR_APPLE_KEY_ID
    APPLE_PRIVATE_KEY=YOUR_APPLE_PRIVATE_KEY
    APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback

    # Microsoft OAuth2
    MICROSOFT_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID
    MICROSOFT_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET
    MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback

    # Web Push Notifications
    VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
    VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
    VAPID_SUBJECT=mailto:your-email@example.com

    # Plaid API
    PLAID_CLIENT_ID=YOUR_PLAID_CLIENT_ID
    PLAID_SECRET=YOUR_PLAID_SECRET
    PLAID_ENV=sandbox # development, sandbox, production
    PLAID_PRODUCTS=transactions
    PLAID_COUNTRY_CODES=US
    PLAID_REDIRECT_URI=http://localhost:5173/auth/plaid/callback
    
    # Email Service (e.g., SendGrid, Mailgun, or custom SMTP)
    EMAIL_SERVICE_HOST=smtp.example.com
    EMAIL_SERVICE_PORT=587
    EMAIL_SERVICE_USER=your_email@example.com
    EMAIL_SERVICE_PASS=your_email_password
    EMAIL_FROM=FamConomy <no-reply@famconomy.com>
    ```

### Database Setup

1.  **Configure your MySQL database** and ensure it's running.

2.  **Update Prisma schema**: If you make changes to `prisma/schema.prisma`, run:
    ```bash
    npx prisma db push
    ```

3.  **Generate Prisma Client**: This generates the Prisma client based on your schema.
    ```bash
    npx prisma generate
    ```

4.  **Seed the database (optional, for development)**:
    ```bash
    npx prisma db seed
    ```

### Running the Project

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The API will be accessible at `http://localhost:3000`.

## Project Structure

```
famconomy-backend/
├── prisma/          # Prisma schema, migrations, and seeding data
│   ├── gigs.json    # Configuration for gig templates and rooms
│   ├── schema.prisma # Database schema definition
│   └── seed.ts      # Script to seed the database with initial data
├── src/
│   ├── app.ts           # Main Express application setup and middleware
│   ├── db.ts            # Prisma client initialization
│   ├── passport.ts      # Passport.js authentication strategies setup
│   ├── controllers/     # Business logic for handling API requests
│   ├── middleware/      # Custom Express middleware (e.g., authentication, error handling, file uploads)
│   ├── routes/          # API route definitions
│   └── utils/           # Utility functions (e.g., email service, Google Calendar integration)
├── .env                 # Environment variables
├── package.json         # Project metadata and dependencies
├── tsconfig.json        # TypeScript configuration
└── uploads/             # Directory for storing uploaded files (e.g., profile photos)
```

## API Endpoints

The API is designed with RESTful principles. Below is a high-level overview of the main endpoint categories:

-   `/auth`: User authentication (login, register, OAuth callbacks, logout, session management).
-   `/family`: Family creation, retrieval, updates, and member management.
-   `/users`: User profile management, retrieval of user lists.
-   `/tasks`: CRUD operations for family tasks.
-   `/budget`: Management of family budgets and financial categories.
-   `/transactions`: Recording and retrieving financial transactions.
-   `/journal`: CRUD operations for journal entries.
-   `/notifications`: Managing user notifications and push subscriptions.
-   `/dashboard`: Retrieval of aggregated dashboard data.
-   `/calendar`: Management of family calendar events.
-   `/messages`: Real-time messaging within families.
-   `/relationships`: Retrieval of predefined relationship types.
-   `/task-statuses`: Retrieval of predefined task statuses.
-   `/approval-statuses`: Retrieval of predefined approval statuses.
-   `/shopping-lists`: CRUD operations for shopping lists.
-   `/shopping-items`: CRUD operations for items within shopping lists.
-   `/savings-goals`: Management of family savings goals.
-   `/invitations`: Handling family invitations (create, accept, decline).
-   `/plaid`: Plaid integration for bank account linking and transaction fetching.
-   `/gigs`: Management of family gigs (chores) and gig templates.
-   `/rooms`: Management of family rooms.
-   `/feedback`: Submission of user feedback and bug reports.

Detailed API documentation (e.g., Swagger/OpenAPI) would typically be generated or provided separately for a production-grade application.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
