import { Artifact } from './artifact';
import { RelayState, TelemetryPayload } from './telemetry';

export interface TelemetryLog {
  id: string;
  timestamp: string | Date;
  category: string;
  message: string;
  relayId?: string | null;
}

export interface VerificationCompletedEvent {
  id: string;
  entropyHash: string;
  status: string;
  timestamp: string | Date;
  relayOrigin: string;
  proof: string;
}

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED_OPERATION';
  timestamp: string | Date;
  uptimeSeconds: number;
  memory: Record<string, any>;
  services: {
    database: string;
    telemetryStream: string;
    attestationQueue: string;
  };
}

export interface QueueEvent {
  jobId: string;
  name: string;
  data: any;
}

export interface SocketPayload {
  'system.status': { connected: boolean; timestamp: string | Date };
  'entropy.generated': TelemetryPayload;
  'artifact.created': Artifact;
  'relay.updated': RelayState;
  'verification.completed': VerificationCompletedEvent;
  'telemetry.log': TelemetryLog;
}
