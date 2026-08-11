import 'express';

// Populated by the requireAuth middleware after verifying the session JWT.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}
