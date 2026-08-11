import type { DocumentKey } from '@amp/shared';
import { prisma } from '../../db.js';

/**
 * Agent-portal logic. Every function is scoped to the agent-user's OWN
 * application (resolved from their User.agentId) — an agent can never touch
 * another agent's data.
 */

/** Resolve the Agent record owned by an agent-user. */
async function resolveAgentId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { agentId: true } });
  return user?.agentId ?? null;
}

export async function getMyApplication(userId: string) {
  const agentId = await resolveAgentId(userId);
  if (!agentId) return null;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { documents: true },
  });
  if (!agent) return null;
  // Never ship the raw base64 in the list payload — just a hasFile flag.
  return {
    ...agent,
    documents: agent.documents.map((d) => ({
      id: d.id,
      key: d.key,
      status: d.status,
      fileName: d.fileName,
      contentType: d.contentType,
      hasFile: !!(d.fileData || d.filePath),
    })),
  };
}

export async function uploadMyDocument(
  userId: string,
  key: DocumentKey,
  fileName: string,
  contentType: string,
  dataBase64: string,
) {
  const agentId = await resolveAgentId(userId);
  if (!agentId) return null;
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'PENDING', fileName, contentType, fileData: dataBase64, filePath: null },
  });
  return getMyApplication(userId);
}

export async function removeMyDocument(userId: string, key: DocumentKey) {
  const agentId = await resolveAgentId(userId);
  if (!agentId) return null;
  await prisma.document.updateMany({
    where: { agentId, key },
    data: { status: 'MISSING', fileName: null, contentType: null, fileData: null, filePath: null },
  });
  return getMyApplication(userId);
}

/** Agent confirms receipt of the college's acknowledgement → drives the review loop. */
export async function acknowledgeReceipt(userId: string) {
  const agentId = await resolveAgentId(userId);
  if (!agentId) return null;
  await prisma.agent.update({ where: { id: agentId }, data: { ackReplied: true } });
  await prisma.auditEvent.create({
    data: { actorId: userId, agentId, action: 'AGENT_ACK_REPLIED', entity: 'Agent' },
  });
  return getMyApplication(userId);
}

/** Submit the application → New Request in the admin queue. */
export async function submitMyApplication(userId: string) {
  const agentId = await resolveAgentId(userId);
  if (!agentId) return null;
  await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'NEW_REQUEST', submittedAt: new Date() },
  });
  await prisma.auditEvent.create({
    data: { actorId: userId, agentId, action: 'SUBMITTED', entity: 'Agent' },
  });
  return getMyApplication(userId);
}
