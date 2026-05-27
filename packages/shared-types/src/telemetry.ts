export interface TelemetryPayload {
  timestamp: string | Date;
  relayId: string;
  relayName: string;
  bits: number;
  source: string;
  entropyHash: string;
  signalState: 'STABLE' | 'FLUCTUATING' | 'DEGRADED';
}

export interface Relay {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | string;
  latency: number;
  uptime: number;
  signalIntegrity: number;
  lastSeen: string | Date;
}

export type RelayState = Relay;

export interface EntropyMetadata {
  beacon: string;
  sequence?: number;
  blockCid?: string;
  round?: number;
  signature?: string;
  verifiable: boolean;
  fetchedAt: string;
}

export interface Metrics {
  totalEntropyGenerated: number;
  activeEntropyRelays: number;
  averageResponseLatency: number;
  verifiedEntropyRate: number;
  totalRequests: number;
  totalVerified: number;
}
