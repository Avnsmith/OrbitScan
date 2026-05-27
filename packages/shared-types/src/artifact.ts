import { VerificationProof } from './verification';

export interface Artifact {
  id: string;
  entropyHash: string;
  entropyBits: number;
  relayId: string;
  source: string;
  verificationStatus: string; // VERIFIED, PENDING, FAILED
  createdAt: string | Date;
  relayName?: string;
  signalIntegrity?: number;
  latency?: number;
  verificationProof?: VerificationProof;
}
