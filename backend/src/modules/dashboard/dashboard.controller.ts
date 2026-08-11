import type { Request, Response } from 'express';
import * as service from './dashboard.service.js';

export async function get(_req: Request, res: Response) {
  const data = await service.getDashboard();
  res.json(data);
}
