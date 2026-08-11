import { Router } from 'express';
import { requireAuth } from './middleware/requireAuth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { agentsRouter } from './modules/agents/agents.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public auth endpoints (login / sso / logout; /me is self-guarded).
apiRouter.use('/auth', authRouter);

// Everything below requires a valid session.
apiRouter.use('/dashboard', requireAuth, dashboardRouter);
apiRouter.use('/agents', requireAuth, agentsRouter);

// Future feature modules mount here (behind requireAuth), e.g.:
// apiRouter.use('/collateral', requireAuth, collateralRouter);
// apiRouter.use('/compliance', requireAuth, complianceRouter);
// apiRouter.use('/reports', requireAuth, reportsRouter);
