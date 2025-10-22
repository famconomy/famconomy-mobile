console.log('--- DEBUG: app.ts starting ---');
import express from 'express';
import passport from './passport';
import cors from 'cors';
import session from 'express-session';
import http from 'http'; // Import http
import { Server } from 'socket.io'; // Import Server from socket.io
import cron from 'node-cron';
import { runConsolidationJob } from './services/memoryService';

import linzRoutes from './routes/linzRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import mealRoutes from './routes/mealRoutes';

import authRoutes from './routes/authRoutes';
import familyRoutes from './routes/familyRoutes';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import budgetRoutes from './routes/budgetRoutes';
import transactionRoutes from './routes/transactionRoutes';
import journalRoutes from './routes/journalRoutes';
import notificationRoutes from './routes/notificationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import calendarRoutes from './routes/calendarRoutes';
import messagesRoutes from './routes/messagesRoutes';
import relationshipRoutes from './routes/relationshipRoutes';
import taskStatusRoutes from './routes/taskStatusRoutes';
import approvalStatusRoutes from './routes/approvalStatusRoutes';
import shoppingListRoutes from './routes/shoppingListRoutes';
import shoppingItemRoutes from './routes/shoppingItemRoutes';
import savingsGoalRoutes from './routes/savingsGoalRoutes';
import invitationsRoutes from './routes/invitationsRoutes';
import pushSubscriptionRoutes from './routes/pushSubscriptionRoutes'; // Import pushSubscriptionRoutes
import publicApiRoutes from './routes/publicApiRoutes'; // Import publicApiRoutes
import feedbackRoutes from './routes/feedback';
import assistantRoutes from './routes/assistantRoutes'; // Import assistantRoutes
import { setAssistantIoInstance } from './controllers/assistantController';
import plaidRoutes from './routes/plaidRoutes'; // Import plaidRoutes
import gigRoutes from './routes/gigRoutes'; // Import gigRoutes
import roomRoutes from './routes/roomRoutes'; // Import roomRoutes
import integrationRoutes from './routes/integrationRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import profileRoutes from './routes/profileRoutes';
import guidelineRoutes from './routes/guidelineRoutes';
import walletRoutes from './routes/walletRoutes';
import recipeRoutes from './routes/recipeRoutes';

import 'dotenv/config';
import cookieParser from 'cookie-parser';

import { loggingMiddleware } from './middleware/logging';

const QUIET_LOG_PREFIXES = ['/notifications'];

const shouldLogRequest = (url: string) => !QUIET_LOG_PREFIXES.some((prefix) => url.startsWith(prefix));

const app = express();
app.use(loggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (shouldLogRequest(req.originalUrl)) {
    console.log('--- DEBUG: req.body in app.ts ---', req.body);
  }
  next();
});
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());

// Middleware to extract tenantId and userId from headers
app.use((req, res, next) => {
  req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || req.query.tenantId; // Allow query param for testing
  req.headers['x-user-id'] = req.headers['x-user-id'] || req.query.userId; // Allow query param for testing
  next();
});

app.use(cors({
  origin: 'https://famconomy.com',
  credentials: true
}));

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

// Import session configuration
import { sessionConfig } from './config/session';
app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: 'https://famconomy.com', // Allow frontend origin for Socket.IO
    methods: ['GET', 'POST']
  }
});

// Pass io instance to controllers that need to emit events
import { setIoInstance } from './controllers/notificationController'; // Import setIoInstance
setIoInstance(io);
setAssistantIoInstance(io);

app.use('/auth', authRoutes);
app.use('/family', familyRoutes);
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/budget', budgetRoutes);
app.use('/transactions', transactionRoutes);
app.use('/journal', journalRoutes);
app.use('/notifications', notificationRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/calendar', calendarRoutes);
console.log('--- DEBUG: messagesRoutes object ---', messagesRoutes);
app.use('/messages', messagesRoutes);
app.use('/relationships', relationshipRoutes);
app.use('/task-statuses', taskStatusRoutes);
app.use('/approval-statuses', approvalStatusRoutes);
app.use('/shopping-lists', shoppingListRoutes);
app.use('/shopping-items', shoppingItemRoutes);
app.use('/savings-goals', savingsGoalRoutes);
app.use('/invitations', invitationsRoutes);
app.use('/subscriptions', pushSubscriptionRoutes); // Use pushSubscriptionRoutes
app.use('/gigs', gigRoutes);
app.use('/rooms', roomRoutes);
app.use('/integrations', integrationRoutes);
app.use('/family/:familyId/wishlists', wishlistRoutes);
app.use('/family/:familyId/members', profileRoutes);
app.use('/family/:familyId/guidelines', guidelineRoutes);
app.use('/plaid', plaidRoutes);
app.use('/wallet', walletRoutes);
app.use('/recipes', recipeRoutes);
app.use('/meals', mealRoutes);
app.use('/linz', linzRoutes);
app.use(['/onboarding', '/api/onboarding'], onboardingRoutes);

app.get('/delete-data', (_req, res) => {
  res
    .status(200)
    .type('html')
    .send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FamConomy Data Deletion Instructions</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; margin: 0; padding: 32px; background: #f9fafb; color: #111827; }
    main { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; }
    p { margin: 0.75rem 0; }
    ol, ul { padding-left: 1.25rem; }
    li + li { margin-top: 0.5rem; }
    @media (max-width: 640px) {
      body { padding: 16px; }
      main { padding: 24px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>FamConomy Data Deletion Instructions</h1>
    <p>
      We respect your privacy. If you created a FamConomy account using Facebook
      or any other sign-in method and want to delete your personal data, follow
      the steps below.
    </p>
    <h2>How to request deletion</h2>
    <ol>
      <li>Email <a href="mailto:info@famconomy.com">info@famconomy.com</a> from the same email address linked to your FamConomy account.</li>
      <li>Use the subject line <strong>"Data Deletion Request"</strong> and include your full name plus the email address tied to the account.</li>
      <li>If you signed in via Facebook, include your Facebook profile URL or UID so we can confirm ownership.</li>
    </ol>
    <h2>What happens next</h2>
    <ul>
      <li>We will acknowledge your request within 5 business days.</li>
      <li>Your account and associated personal data will be permanently deleted within 30 days unless we must retain specific records for legal reasons.</li>
      <li>You will receive an email confirmation once deletion is complete.</li>
    </ul>
    <p>
      If you cannot email us, mail a written request to:<br />
      <strong>FamConomy / LindZen Labs</strong><br />
      1900 Jay Ell Drive, Richardson, TX 75081
    </p>
    <p>For questions, contact <a href="mailto:info@famconomy.com">info@famconomy.com</a>.</p>
  </main>
</body>
</html>
    `);
});

app.use((req, res, next) => {
  if (shouldLogRequest(req.originalUrl)) {
    console.log(`--- DEBUG: Request passing through generic middleware: ${req.method} ${req.url} ---`);
  }
  next();
});

app.use('/feedback', feedbackRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// These must be last
app.use('/', assistantRoutes); // Use assistantRoutes for /assistant endpoint
app.use('/', publicApiRoutes); // Use publicApiRoutes for /api/ endpoints

httpServer.listen(3000, () => { // Change app.listen to httpServer.listen
  console.log('🚀 FamConomy API running at http://localhost:3000');
});

const linzJobEnabled = (process.env.ENABLE_LINZ_CONSOLIDATION_JOB ?? 'false').toLowerCase() === 'true';

if (linzJobEnabled) {
  // Schedule LinZ Memory Consolidation Job to run hourly
  cron.schedule("0 * * * *", () => {
    console.log('Running hourly LinZ Memory Consolidation Job...');
    runConsolidationJob().catch(error => console.error('Error running consolidation job:', error));
  });
} else {
  console.log('LinZ Memory Consolidation Job disabled (set ENABLE_LINZ_CONSOLIDATION_JOB=true to enable)');
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1); // Exit the process to avoid undefined state
});
