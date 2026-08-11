// Domain enums — the single source of truth shared by backend and frontend.
// Keep these in sync with backend/prisma/schema.prisma.

export const AGENT_STATUS = [
  'NEW_REQUEST',
  'IN_REVIEW',
  'PENDING_DOCUMENTS',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'TERMINATED',
] as const;
export type AgentStatus = (typeof AGENT_STATUS)[number];

export const AGENT_TYPE = ['EDUCATION', 'DUAL'] as const;
export type AgentType = (typeof AGENT_TYPE)[number];

/** Document keys collected during verification. MARN applies to dual (migration) agents only. */
export const DOCUMENT_KEY = ['REG', 'ASIC', 'ID', 'PIER', 'MARN'] as const;
export type DocumentKey = (typeof DOCUMENT_KEY)[number];

export const DOCUMENT_STATUS = ['MISSING', 'PENDING', 'VERIFIED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUS)[number];

export const REFERENCE_OUTCOME = ['PENDING', 'PASSED'] as const;
export type ReferenceOutcome = (typeof REFERENCE_OUTCOME)[number];

export const RATING = ['A', 'B', 'C', 'UNRATED'] as const;
export type Rating = (typeof RATING)[number];

export const USER_ROLE = ['ADMIN', 'REVIEWER', 'AUDITOR'] as const;
export type UserRole = (typeof USER_ROLE)[number];

/** The four gated stages of the verification pipeline (PRD §08). */
export const REVIEW_STAGE = {
  BUSINESS_REGISTRATION: 1,
  CERTIFICATION: 2,
  REFERENCES: 3,
  FINAL_REVIEW: 4,
} as const;
export type ReviewStage = (typeof REVIEW_STAGE)[keyof typeof REVIEW_STAGE];

export const DOCUMENT_KEY_LABELS: Record<DocumentKey, string> = {
  REG: 'Business Registration',
  ASIC: 'ASIC Extract',
  ID: 'Identity Documents',
  PIER: 'QEAC / PIER Certificate',
  MARN: 'MARN Registration',
};

/** Human-readable labels for UI. */
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  NEW_REQUEST: 'New Request',
  IN_REVIEW: 'In Review',
  PENDING_DOCUMENTS: 'Pending Documents',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  TERMINATED: 'Terminated',
};
