import { type NextFunction, type Request, type Response, Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as controller from './auth.controller.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const authRouter = Router();

authRouter.post('/login', wrap(controller.login));
authRouter.post('/sso', wrap(controller.ssoLogin));
authRouter.post('/logout', wrap(controller.logout));
authRouter.get('/me', requireAuth, wrap(controller.me));
