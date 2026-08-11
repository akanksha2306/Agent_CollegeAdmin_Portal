import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Catch-all error handler — keeps route code free of try/catch boilerplate. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ error: message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}
