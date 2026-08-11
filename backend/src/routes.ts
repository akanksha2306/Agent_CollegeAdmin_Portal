import { Router } from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { agentsRouter } from './modules/agents/agents.routes.js';
import { agentPortalRouter } from './modules/agentPortal/agentPortal.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public auth endpoints (login / sso / logout; /me is self-guarded).
apiRouter.use('/auth', authRouter);

// Admin area — staff roles only (agents are blocked).
const staffOnly = requireRole('ADMIN', 'REVIEWER', 'AUDITOR');
apiRouter.use('/dashboard', requireAuth, staffOnly, dashboardRouter);
apiRouter.use('/agents', requireAuth, staffOnly, agentsRouter);

// Agent-facing portal (AGENT role, own application only).
apiRouter.use('/agent', requireAuth, agentPortalRouter);

// Future feature modules mount here (behind requireAuth), e.g.:
// apiRouter.use('/collateral', requireAuth, collateralRouter);
// apiRouter.use('/compliance', requireAuth, complianceRouter);
// apiRouter.use('/reports', requireAuth, reportsRouter);
