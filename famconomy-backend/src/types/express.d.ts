// Extend Express Request interface to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        fullName: string;
        role?: string;
      };
    }
  }
}

export {};