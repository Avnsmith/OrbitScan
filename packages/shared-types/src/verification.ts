export interface VerificationProof {
  signature?: string;
  signerRelay: string;
  attestationScore: number;
  entropyOrigin?: string;
  source?: string;
  verifiable?: boolean;
  beaconUrl?: string | null;
}

export type AttestationState = 'VERIFIED' | 'PENDING' | 'FAILED';
