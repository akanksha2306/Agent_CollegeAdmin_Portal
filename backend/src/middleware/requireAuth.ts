import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export const SESSION_COOKIE = 'amp_session';

interface SessionPayload {
  sub: string;
  role: string;
}

/** Blocks the request unless a valid session cookie is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, env.jwtSecret) as SessionPayload;
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
