import type {
  AgentStatus,
  AgentType,
  DocumentKey,
  DocumentStatus,
  Rating,
  ReferenceOutcome,
  UserRole,
} from './enums.js';

export interface AgentDocument {
  id: string;
  key: DocumentKey;
  fileName: string | null;
  status: DocumentStatus;
  verifiedAt: string | null;
}

export interface AgentReference {
  id: string;
  refereeName: string;
  cricosProvider: string;
  outcome: ReferenceOutcome;
}

export interface PerformanceSnapshot {
  intake: string;
  enrolments: number;
  conversion: number;
  visaRefusal: number;
  withdrawals: number;
}

export interface Agent {
  id: string;
  appId: string;
  business: string;
  contactName: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  type: AgentType;
  abn: string | null;
  acn: string | null;
  marn: string | null;
  onshore: boolean;
  status: AgentStatus;
  rating: Rating;
  certExpiry: string | null;
  stage: number;
  ackSent: boolean;
  ackReplied: boolean;
  agreementSigned: boolean;
  submittedAt: string;
  documents?: AgentDocument[];
  references?: AgentReference[];
  performance?: PerformanceSnapshot[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
}

/** Login credentials (college-admin sign-in). */
export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  note?: string;
}

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface WorkQueueItem {
  id: string;
  appId: string;
  business: string;
  country: string;
  status: AgentStatus;
  submittedAt: string;
  priority: Priority;
  action: string;
  due: string;
  cta: string;
}

export interface DashboardData {
  stats: DashboardStat[];
  workQueue: WorkQueueItem[];
}

/** Payload shape for creating a new agent application (agent portal intake). */
export interface CreateAgentInput {
  business: string;
  contactName: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  type: AgentType;
  onshore: boolean;
}

/** An audit-trail entry for display (PRD §13). */
export interface AuditEventDTO {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  actorName: string | null;
  recipient?: string | null;
}

/** Mock portal credentials generated on approval (PRD §09). */
export interface ProvisioningInfo {
  username: string;
  tempPassword: string;
}

/** Response when an application is approved — the agent plus the (mock) credentials to send. */
export interface ApproveResult {
  agent: Agent;
  provisioning: ProvisioningInfo;
}

/** Standard API error body. */
export interface ApiError {
  error: string;
  details?: unknown;
}
