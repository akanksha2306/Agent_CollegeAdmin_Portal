import type { User as PrismaUser } from '@prisma/client';
import type { User } from '@amp/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db.js';
import { env } from '../../env.js';

// The username the mock SSO flow resolves to. A real OIDC/SAML integration would
// map the federated identity from the IdP assertion to a local user instead.
const SSO_ADMIN_USERNAME = 'robin.admin';

/** Verify username + password. Returns the user on success, null otherwise. */
export async function authenticate(username: string, password: string): Promise<PrismaUser | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

/**
 * MOCK SSO SEAM. A real "Continue with University SSO" flow would:
 *   1. redirect the browser to the university IdP (OIDC authorize / SAML),
 *   2. receive the callback with an auth code / assertion,
 *   3. validate it and map the federated identity to a local user.
 * Here we short-circuit to a known admin so the button is fully functional in dev.
 */
export async function resolveSsoUser(): Promise<PrismaUser | null> {
  return prisma.user.findUnique({ where: { username: SSO_ADMIN_USERNAME } });
}

export async function getUserById(id: string): Promise<PrismaUser | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function issueToken(user: PrismaUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: '8h' });
}

/** Strip secrets before sending a user to the client. */
export function toPublicUser(user: PrismaUser): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
