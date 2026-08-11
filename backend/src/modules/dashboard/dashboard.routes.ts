import { type NextFunction, type Request, type Response, Router } from 'express';
import * as controller from './dashboard.controller.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const dashboardRouter = Router();

dashboardRouter.get('/', wrap(controller.get));
