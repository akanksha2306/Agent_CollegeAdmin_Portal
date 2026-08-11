import fs from 'node:fs';
import type { AgentStatus, CreateAgentInput, DocumentKey, ProvisioningInfo } from '@amp/shared';
import { stageGateMet } from '@amp/shared';
import { prisma } from '../../db.js';

/**
 * Agent domain logic. Keep business rules here (not in controllers) so they
 * can be reused and unit-tested independently of Express.
 */

const DOC_KEYS: DocumentKey[] = ['REG', 'ASIC', 'ID', 'PIER'];

function nextAppId(count: number): string {
  return `AMP-26-${1001 + count}`;
}

export async function listAgents(status?: string) {
  return prisma.agent.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { submittedAt: 'desc' },
    include: { documents: true },
  });
}

export async function getAgent(id: string) {
  return prisma.agent.findUnique({
    where: { id },
    include: { documents: true, references: true, performance: true },
  });
}

export async function createAgent(input: CreateAgentInput) {
  const count = await prisma.agent.count();
  const keys: DocumentKey[] = input.type === 'DUAL' ? [...DOC_KEYS, 'MARN'] : DOC_KEYS;

  return prisma.agent.create({
    data: {
      appId: nextAppId(count),
      business: input.business,
      contactName: input.contactName,
      country: input.country,
      city: input.city,
      email: input.email,
      phone: input.phone,
      type: input.type,
      onshore: input.onshore,
      status: 'NEW_REQUEST',
      stage: 1,
      documents: {
        create: keys.map((key) => ({ key, status: 'MISSING' })),
      },
    },
    include: { documents: true },
  });
}

export async function verifyDocument(agentId: string, key: DocumentKey) {
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'VERIFIED', verifiedAt: new Date() },
  });
  return getAgent(agentId);
}

export async function uploadDocument(agentId: string, key: DocumentKey, fileName: string) {
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'PENDING', fileName },
  });
  return getAgent(agentId);
}

/** Attach a real uploaded file (stored on disk) to a document. */
export async function attachDocumentFile(
  agentId: string,
  key: DocumentKey,
  fileName: string,
  filePath: string,
) {
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'PENDING', fileName, filePath },
  });
  return getAgent(agentId);
}

/** Return the stored file's disk path + original name, or null. */
export async function getDocumentFile(agentId: string, key: DocumentKey) {
  const doc = await prisma.document.findFirst({ where: { agentId, key } });
  if (!doc?.filePath) return null;
  return { filePath: doc.filePath, fileName: doc.fileName ?? 'document' };
}

/** Remove an uploaded document: delete the file from disk and reset it to Missing. */
export async function removeDocumentFile(agentId: string, key: DocumentKey) {
  const doc = await prisma.document.findFirst({ where: { agentId, key } });
  if (doc?.filePath) {
    try {
      fs.unlinkSync(doc.filePath);
    } catch {
      // File already gone — safe to ignore.
    }
  }
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'MISSING', fileName: null, filePath: null, verifiedAt: null },
  });
  return getAgent(agentId);
}

export async function updateAgent(
  agentId: string,
  data: { onshore?: boolean; stage?: number },
) {
  await prisma.agent.update({ where: { id: agentId }, data });
  return getAgent(agentId);
}

/**
 * Whether the agent's current stage gate is satisfied (PRD §08).
 * Delegates to the shared rule so backend and frontend never drift.
 */
export async function isStageGateMet(id: string): Promise<boolean> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: { documents: true, references: true },
  });
  if (!agent) return false;
  return stageGateMet(agent);
}

// ── Review pipeline: stage navigation ──

/** Advance to the next stage. Caller must confirm the gate is met first. */
export async function advanceStage(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;
  const next = Math.min(4, agent.stage + 1);
  await prisma.agent.update({
    where: { id: agentId },
    data: { stage: next, status: agent.status === 'NEW_REQUEST' ? 'IN_REVIEW' : agent.status },
  });
  return getAgent(agentId);
}

export async function backStage(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;
  await prisma.agent.update({ where: { id: agentId }, data: { stage: Math.max(1, agent.stage - 1) } });
  return getAgent(agentId);
}

// ── Stage 3: acknowledgement loop + references ──

export async function sendAck(agentId: string) {
  await prisma.agent.update({ where: { id: agentId }, data: { ackSent: true } });
  return getAgent(agentId);
}

export async function markAckReplied(agentId: string) {
  await prisma.agent.update({ where: { id: agentId }, data: { ackReplied: true } });
  return getAgent(agentId);
}

export async function approveReference(agentId: string, referenceId: string) {
  await prisma.reference.updateMany({
    where: { id: referenceId, agentId },
    data: { outcome: 'PASSED' },
  });
  return getAgent(agentId);
}

/** Audit trail for an agent, newest first, with actor name resolved (PRD §13). */
export async function listAuditEvents(agentId: string) {
  const events = await prisma.auditEvent.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { name: true } } },
  });
  return events.map((e) => {
    const after = (e.after ?? {}) as { recipient?: string };
    return {
      id: e.id,
      action: e.action,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
      actorName: e.actor?.name ?? null,
      recipient: after.recipient ?? null,
    };
  });
}

// ── Decisions (PRD §08) ──

export async function setStatus(agentId: string, status: AgentStatus) {
  await prisma.agent.update({ where: { id: agentId }, data: { status } });
  return getAgent(agentId);
}

/**
 * Request more information from the agent (PRD §08).
 * Moves to Pending Documents, and records where the request went — the agent's
 * Business-&-contact email — in the audit trail. (Real email send is Phase 2.)
 */
export async function requestInfo(agentId: string, actorId: string | undefined, message: string | undefined) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;

  await prisma.agent.update({ where: { id: agentId }, data: { status: 'PENDING_DOCUMENTS' } });
  await prisma.auditEvent.create({
    data: {
      actorId: actorId ?? null,
      agentId,
      action: 'REQUEST_INFO',
      entity: 'Agent',
      reason: message ?? null,
      after: { recipient: agent.email, message: message ?? '' },
    },
  });
  return getAgent(agentId);
}

/**
 * Reject the application (PRD §08). Moves to Rejected and records the rejection
 * reason + recipient (the agent's email) in the audit trail. (Email send is Phase 2.)
 */
export async function rejectAgent(agentId: string, actorId: string | undefined, message: string | undefined) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;

  await prisma.agent.update({ where: { id: agentId }, data: { status: 'REJECTED' } });
  await prisma.auditEvent.create({
    data: {
      actorId: actorId ?? null,
      agentId,
      action: 'REJECTED',
      entity: 'Agent',
      reason: message ?? null,
      after: { recipient: agent.email, message: message ?? '' },
    },
  });
  return getAgent(agentId);
}

/** Approve → move to Approved. Activation (agreement + account) follows (PRD §09). */
export async function approveAgent(agentId: string, actorId: string | undefined) {
  await prisma.agent.update({ where: { id: agentId }, data: { status: 'APPROVED' } });
  await prisma.auditEvent.create({
    data: { actorId: actorId ?? null, agentId, action: 'APPROVED', entity: 'Agent' },
  });
  return getAgent(agentId);
}

// ── Activation state (PRD §09) — post-approval ──

/** Mark the ESOS written agreement as signed/accepted by the agent (mock). */
export async function markAgreementSigned(agentId: string, actorId: string | undefined) {
  await prisma.agent.update({ where: { id: agentId }, data: { agreementSigned: true } });
  await prisma.auditEvent.create({
    data: { actorId: actorId ?? null, agentId, action: 'AGREEMENT_SIGNED', entity: 'Agent' },
  });
  return getAgent(agentId);
}

/**
 * Create the agent's portal account + (mock) send login. Requires the agent to
 * be Approved and the written agreement signed. Moves the agent to Active.
 * Returns null if the guard fails.
 */
export async function provisionAccount(agentId: string, actorId: string | undefined) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.status !== 'APPROVED' || !agent.agreementSigned) return null;

  const provisioning = generateProvisioning(agent.contactName, agent.business);
  await prisma.agent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } });
  await prisma.auditEvent.create({
    data: {
      actorId: actorId ?? null,
      agentId,
      action: 'ACCOUNT_CREATED',
      entity: 'Agent',
      after: { username: provisioning.username },
    },
  });
  const full = await getAgent(agentId);
  return { agent: full, provisioning };
}

/** Derive a mock portal username + temp password. Real send is deferred (Phase 2). */
export function generateProvisioning(contactName: string, business: string): ProvisioningInfo {
  const parts = (contactName || '').trim().split(/\s+/);
  const base = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1] : business || 'agent';
  const uname = base.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return {
    username: `${uname}@agents.australiancollege.edu.au`,
    tempPassword: `${pw.slice(0, 4)}-${pw.slice(4, 8)}`,
  };
}
