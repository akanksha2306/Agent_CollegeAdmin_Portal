import type { Request, Response } from 'express';
import { z } from 'zod';
import { AGENT_TYPE, DOCUMENT_KEY, type DocumentKey } from '@amp/shared';
import * as service from './agents.service.js';

function parseDocumentKey(value: string): DocumentKey | null {
  return (DOCUMENT_KEY as readonly string[]).includes(value) ? (value as DocumentKey) : null;
}

const uploadSchema = z.object({ fileName: z.string().min(1) });
const patchSchema = z.object({
  onshore: z.boolean().optional(),
  stage: z.number().int().min(1).max(4).optional(),
});

const createAgentSchema = z.object({
  business: z.string().min(1),
  contactName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  type: z.enum(AGENT_TYPE),
  onshore: z.boolean(),
});

export async function list(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const agents = await service.listAgents(status);
  res.json(agents);
}

export async function getOne(req: Request, res: Response) {
  const agent = await service.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function create(req: Request, res: Response) {
  const input = createAgentSchema.parse(req.body);
  const agent = await service.createAgent(input);
  res.status(201).json(agent);
}

export async function verifyDoc(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const agent = await service.verifyDocument(req.params.id, key);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function uploadDoc(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const { fileName } = uploadSchema.parse(req.body);
  const agent = await service.uploadDocument(req.params.id, key, fileName);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function uploadDocFile(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const agent = await service.attachDocumentFile(req.params.id, key, req.file.originalname, req.file.path);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function downloadDocFile(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const file = await service.getDocumentFile(req.params.id, key);
  if (!file) return res.status(404).json({ error: 'No file uploaded for this document' });
  if (file.kind === 'base64') {
    const buf = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    return res.send(buf);
  }
  res.download(file.filePath, file.fileName);
}

export async function removeDocFile(req: Request, res: Response) {
  const key = parseDocumentKey(req.params.key);
  if (!key) return res.status(400).json({ error: 'Invalid document key' });
  const agent = await service.removeDocumentFile(req.params.id, key);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function patch(req: Request, res: Response) {
  const data = patchSchema.parse(req.body);
  const agent = await service.updateAgent(req.params.id, data);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function gate(req: Request, res: Response) {
  const met = await service.isStageGateMet(req.params.id);
  res.json({ gateMet: met });
}

export async function audit(req: Request, res: Response) {
  const events = await service.listAuditEvents(req.params.id);
  res.json(events);
}

// ── Stage navigation ──

export async function advance(req: Request, res: Response) {
  const met = await service.isStageGateMet(req.params.id);
  if (!met) return res.status(400).json({ error: 'Stage gate not met' });
  const agent = await service.advanceStage(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function back(req: Request, res: Response) {
  const agent = await service.backStage(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

// ── Stage 3 ──

export async function sendAck(req: Request, res: Response) {
  const agent = await service.sendAck(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function markReplied(req: Request, res: Response) {
  const agent = await service.markAckReplied(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function approveReference(req: Request, res: Response) {
  const agent = await service.approveReference(req.params.id, req.params.refId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

// ── Decisions ──

const requestInfoSchema = z.object({ message: z.string().optional() });

export async function requestInfo(req: Request, res: Response) {
  const { message } = requestInfoSchema.parse(req.body ?? {});
  const agent = await service.requestInfo(req.params.id, req.userId, message);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function reject(req: Request, res: Response) {
  const { message } = requestInfoSchema.parse(req.body ?? {});
  const agent = await service.rejectAgent(req.params.id, req.userId, message);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function approve(req: Request, res: Response) {
  const agent = await service.approveAgent(req.params.id, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function agreementSign(req: Request, res: Response) {
  const agent = await service.markAgreementSigned(req.params.id, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}

export async function provision(req: Request, res: Response) {
  const result = await service.provisionAccount(req.params.id, req.userId);
  if (!result) return res.status(400).json({ error: 'Agent must be approved with a signed agreement first' });
  res.json(result);
}
