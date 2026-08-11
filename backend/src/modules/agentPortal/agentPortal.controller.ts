import type { Request, Response } from 'express';
import { z } from 'zod';
import { DOCUMENT_KEY, type DocumentKey } from '@amp/shared';
import * as service from './agentPortal.service.js';

function parseDocumentKey(value: string): DocumentKey | null {
  return (DOCUMENT_KEY as readonly string[]).includes(value) ? (value as DocumentKey) : null;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ALLOWED = ['image/png', 'image/jpeg', 'application/pdf'];

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().refine((c) => ALLOWED.includes(c), 'Only PNG, JPEG, or PDF allowed'),
  dataBase64: z.string().min(1),
});

export async function getApplication(req: Request, res: Response) {
  const app = await service.getMyApplication(req.userId!);
  if (!app) return res.status(404).json({ error: 'No application found for this account' });
  res.json(app);
}

export async function uploadDocument(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const { fileName, contentType, dataBase64 } = uploadSchema.parse(req.body);
  // Reject oversized files (base64 length ≈ 4/3 of raw bytes).
  if (Buffer.byteLength(dataBase64, 'utf8') * 0.75 > MAX_BYTES) {
    return res.status(400).json({ error: 'File too large (max 8 MB)' });
  }
  const app = await service.uploadMyDocument(req.userId!, key, fileName, contentType, dataBase64);
  if (!app) return res.status(404).json({ error: 'No application found' });
  res.json(app);
}

export async function removeDocument(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const app = await service.removeMyDocument(req.userId!, key);
  if (!app) return res.status(404).json({ error: 'No application found' });
  res.json(app);
}

export async function acknowledge(req: Request, res: Response) {
  const app = await service.acknowledgeReceipt(req.userId!);
  if (!app) return res.status(404).json({ error: 'No application found' });
  res.json(app);
}

export async function submit(req: Request, res: Response) {
  const app = await service.submitMyApplication(req.userId!);
  if (!app) return res.status(404).json({ error: 'No application found' });
  res.json(app);
}
