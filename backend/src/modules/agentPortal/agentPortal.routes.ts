import { type NextFunction, type Request, type Response, Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import * as controller from './agentPortal.controller.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// All agent-portal routes require an authenticated AGENT.
export const agentPortalRouter = Router();
agentPortalRouter.use(requireRole('AGENT'));

agentPortalRouter.get('/application', wrap(controller.getApplication));
agentPortalRouter.post('/documents/:key', wrap(controller.uploadDocument));
agentPortalRouter.delete('/documents/:key', wrap(controller.removeDocument));
agentPortalRouter.post('/acknowledge', wrap(controller.acknowledge));
agentPortalRouter.post('/submit', wrap(controller.submit));
