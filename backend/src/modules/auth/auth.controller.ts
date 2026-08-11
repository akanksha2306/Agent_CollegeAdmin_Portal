import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../env.js';
import { SESSION_COOKIE } from '../../middleware/requireAuth.js';
import * as service from './auth.service.js';

const loginSchema = z.object({
  // Forgiving input: usernames are case-insensitive and whitespace-trimmed so a
  // stray capital or trailing space (autofill/autocapitalize) still signs in.
  username: z.string().min(1).transform((s) => s.trim().toLowerCase()),
  // Trim surrounding whitespace only — password stays case-sensitive.
  password: z.string().min(1).transform((s) => s.trim()),
});

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: EIGHT_HOURS,
    path: '/',
  };
}

export async function login(req: Request, res: Response) {
  const { username, password } = loginSchema.parse(req.body);
  const user = await service.authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  res.cookie(SESSION_COOKIE, service.issueToken(user), sessionCookieOptions());
  res.json({ user: service.toPublicUser(user) });
}

export async function ssoLogin(_req: Request, res: Response) {
  const user = await service.resolveSsoUser();
  if (!user) return res.status(401).json({ error: 'SSO account not found' });

  res.cookie(SESSION_COOKIE, service.issueToken(user), sessionCookieOptions());
  res.json({ user: service.toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = req.userId ? await service.getUserById(req.userId) : null;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: service.toPublicUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
}
