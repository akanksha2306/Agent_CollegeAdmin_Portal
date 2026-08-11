import type { AgentType, DocumentKey, DocumentStatus, ReferenceOutcome } from './enums.js';

/** Minimal structural shape the gate check needs — satisfied by both the
 *  Prisma agent (with includes) and the frontend Agent type. */
export interface GateAgent {
  stage: number;
  type: AgentType;
  ackReplied: boolean;
  documents?: { key: DocumentKey; status: DocumentStatus }[] | null;
  references?: { refereeName: string; outcome: ReferenceOutcome }[] | null;
}

/**
 * Whether the agent's CURRENT stage gate is satisfied (PRD §08).
 * Shared by backend (enforcement) and frontend (disable the Continue button)
 * so the rule can never drift between the two.
 */
export function stageGateMet(a: GateAgent): boolean {
  const docs = a.documents ?? [];
  const refs = a.references ?? [];
  const verified = (key: DocumentKey) => docs.some((d) => d.key === key && d.status === 'VERIFIED');

  switch (a.stage) {
    case 1: // Business Registration
      return verified('REG') && verified('ASIC') && verified('ID');
    case 2: // Certification
      return verified('PIER') && (a.type !== 'DUAL' || verified('MARN'));
    case 3: { // References
      const real = refs.filter((r) => r.refereeName !== '—');
      return a.ackReplied && real.length > 0 && real.every((r) => r.outcome === 'PASSED');
    }
    case 4: // Final Review
      return true;
    default:
      return false;
  }
}

/** Short note explaining what's blocking the current gate (empty when met). */
export function gateNote(a: GateAgent): string {
  if (stageGateMet(a)) return '';
  return [
    'Verify all registration documents to continue.',
    'Verify the certification to continue.',
    'Send the acknowledgement email, receive the reply, and approve references to continue.',
    '',
  ][a.stage - 1] ?? '';
}
