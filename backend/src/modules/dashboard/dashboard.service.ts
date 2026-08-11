import type { DashboardData, DashboardStat, Priority, WorkQueueItem } from '@amp/shared';
import { prisma } from '../../db.js';

const DAY = 24 * 60 * 60 * 1000;

/** Derive the prioritised action for a queued agent (computed, not a task model). */
function queueMeta(status: string, submittedAt: Date): { priority: Priority; action: string; due: string; cta: string } {
  const ageDays = Math.floor((Date.now() - submittedAt.getTime()) / DAY);
  if (status === 'PENDING_DOCUMENTS') {
    return { priority: 'MEDIUM', action: 'Follow up on requested documents', due: `${Math.max(0, 15 - ageDays)}d`, cta: 'Review' };
  }
  // NEW_REQUEST — older requests are more urgent
  const priority: Priority = ageDays >= 3 ? 'HIGH' : 'MEDIUM';
  return { priority, action: 'Review new application', due: ageDays >= 3 ? 'Overdue' : `${3 - ageDays}d`, cta: 'Open' };
}

/** Aggregate the admin dashboard from live agent data (PRD §10). */
export async function getDashboard(): Promise<DashboardData> {
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      appId: true,
      business: true,
      country: true,
      status: true,
      certExpiry: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  const count = (status: string) => agents.filter((a) => a.status === status).length;

  const soon = Date.now() + 90 * DAY;
  const expiringCerts = agents.filter(
    (a) => a.certExpiry && a.certExpiry.getTime() <= soon,
  ).length;

  const stats: DashboardStat[] = [
    { key: 'total', label: 'Total Agents', value: agents.length, note: 'All partnerships' },
    { key: 'new', label: 'New Requests', value: count('NEW_REQUEST'), note: 'Awaiting first review' },
    { key: 'active', label: 'Active Agents', value: count('ACTIVE'), note: 'Currently recruiting' },
    {
      key: 'pending',
      label: 'Pending Reviews',
      value: count('IN_REVIEW') + count('PENDING_DOCUMENTS'),
      note: 'In your queue',
    },
    { key: 'expiring', label: 'Expiring Certs', value: expiringCerts, note: 'Within 90 days' },
  ];

  const priorityRank: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  const workQueue: WorkQueueItem[] = agents
    .filter((a) => a.status === 'NEW_REQUEST' || a.status === 'PENDING_DOCUMENTS')
    .map((a) => {
      const meta = queueMeta(a.status, a.submittedAt);
      return {
        id: a.id,
        appId: a.appId,
        business: a.business,
        country: a.country,
        status: a.status,
        submittedAt: a.submittedAt.toISOString(),
        ...meta,
      };
    })
    .sort((x, y) => priorityRank[x.priority] - priorityRank[y.priority])
    .slice(0, 8);

  return { stats, workQueue };
}
