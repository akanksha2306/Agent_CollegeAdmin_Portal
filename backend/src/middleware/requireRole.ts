import type { NextFunction, Request, Response } from 'express';

/** Allow only the given role(s). Must run after requireAuth (which sets req.userRole). */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
