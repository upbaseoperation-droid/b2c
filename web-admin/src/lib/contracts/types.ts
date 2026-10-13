export type ContractRole = 'CREATOR' | 'LEGAL' | 'FINANCE' | 'LEAD' | 'SIGN_COORDINATOR' | 'AUDITOR';
export interface ContractActor { id: string; name: string; roles: ContractRole[]; brands: string[]; allBrands?: boolean }
export interface ContractField { key: string; label: string; context: string; required: boolean; part: string; paragraph: number; start?: number; end?: number }
export interface LegalTemplate { id: string; name: string; filename: string; subject: string; kind: 'CONTRACT' | 'ACCEPTANCE'; version: string; hash: string; fields: ContractField[]; paragraphs: string[] }
export interface ReviewStep { role: 'LEGAL' | 'FINANCE' | 'LEAD'; reviewerId: string; reviewerName: string; status: 'PENDING' | 'APPROVED' | 'CHANGES' | 'REJECTED'; note: string; decidedAt?: string; version: number }
export interface ContractFinding { severity: 'ERROR' | 'WARNING' | 'INFO'; message: string; evidence: string; fieldKey?: string }
export interface AiCheck { version: number; at: string; provider: 'RULES' | 'AI'; findings: ContractFinding[] }
export interface SigningPerson { name: string; email: string; action: number; status: string; at?: string }
export interface SigningAttempt { documentId: string; version: number; linkedBy: string; linkedAt: string; status: string; sourceStatus: number; people: SigningPerson[]; syncedAt: string; error?: string; evidenceConfirmedBy: string; evidenceHash: string }
export interface ContractEvent { at: string; actorId: string; actorName: string; action: string; note: string; version: number }
export interface ContractRevision { version: number; values: Record<string, string>; at: string; actorId: string }
export interface ContractRecord {
  id: string; title: string; brand: string; partner: string; ownerId: string; ownerName: string;
  templateId: string; templateHash: string; version: number; revision: number; values: Record<string, string>;
  createdAt: string; updatedAt: string; approval: 'DRAFT' | 'IN_REVIEW' | 'CHANGES' | 'REJECTED' | 'APPROVED';
  steps: ReviewStep[]; checks: AiCheck[]; signing: SigningAttempt[]; history: ContractEvent[]; versions: ContractRevision[];
  parentId?: string;
}
