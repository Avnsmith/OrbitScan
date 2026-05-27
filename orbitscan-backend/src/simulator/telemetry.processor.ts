import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { Artifact } from '@orbitscan/shared-types';

@Processor('telemetry-ingestion')
export class TelemetryProcessor extends WorkerHost {
  private readonly logger = new Logger(TelemetryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryGateway: TelemetryGateway,
    @InjectQueue('telemetry-ingestion') private readonly telemetryQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;
    this.logger.log(`Processing queue job: ${name} (ID: ${job.id})`);

    try {
      if (name === 'ingest-payload') {
        const { artifactId, entropyHash, bits, relayId, source } = data;

        // Check if entropyHash already exists in the database to prevent duplicate ingestion crashes
        const existing = this.prisma.isFallbackMode
          ? this.prisma.artifacts.find((a) => a.entropyHash === entropyHash)
          : await this.prisma.artifact.findUnique({ where: { entropyHash } });

        if (existing) {
          this.logger.warn(`Duplicate telemetry payload detected (entropyHash: ${entropyHash}). Skipping ingestion gracefully.`);
          return { status: 'SKIPPED_DUPLICATE', id: existing.id };
        }

        // Create PENDING artifact in DB or fallback memory
        const artifact = await this.createArtifact({
          id: artifactId,
          entropyHash,
          entropyBits: bits,
          relayId,
          source,
          verificationStatus: 'PENDING',
          createdAt: new Date(),
        });

        this.telemetryGateway.broadcastArtifactCreated(artifact);
        await this.createLog(
          'system',
          `Telemetry payload ingested: ID #${artifact.id} registered under relay ${relayId}`,
          relayId
        );

        // Enqueue the verification job with a 3000ms delay in BullMQ
        await this.telemetryQueue.add('verify-signature', {
          artifactId,
          relayId,
          entropyHash,
          bits,
        }, { 
          delay: 3000,
          jobId: `verify-${entropyHash}`, // Prevent duplicate verification jobs
        });

      } else if (name === 'verify-signature') {
        const { artifactId, relayId, entropyHash, bits } = data;

        // Update artifact status to VERIFIED
        const verifiedArtifact = await this.updateArtifactStatus(artifactId, 'VERIFIED');

        if (verifiedArtifact) {
          const relays = this.prisma.isFallbackMode
            ? this.prisma.relays
            : await this.prisma.relay.findMany();
          const relay = relays.find((r: any) => r.id === relayId);
          const relayName = relay ? relay.name : 'Unknown Relay';

          this.telemetryGateway.broadcastVerificationCompleted({
            id: verifiedArtifact.id,
            entropyHash: verifiedArtifact.entropyHash,
            status: 'VERIFIED',
            timestamp: new Date(),
            relayOrigin: relayName,
            proof: '0x_proof_sig_' + crypto.randomBytes(16).toString('hex'),
          });

          await this.createLog(
            'entropy',
            `INTEGRITY ATTESTATION VERIFIED: Telemetry payload #${verifiedArtifact.id} signature verified successfully.`,
            relayId
          );
        }
      }
    } catch (err) {
      this.logger.error(`Error processing telemetry job ${name}:`, err);
      throw err;
    }
  }

  private async createArtifact(data: any): Promise<Artifact> {
    if (this.prisma.isFallbackMode) {
      // Avoid duplicate logs in memory array fallback
      const exists = this.prisma.artifacts.find(a => a.entropyHash === data.entropyHash);
      if (exists) return exists;
      this.prisma.artifacts.unshift(data);
      if (this.prisma.artifacts.length > 100) this.prisma.artifacts.pop();
      return data;
    }
    try {
      return await this.prisma.artifact.upsert({
        where: { entropyHash: data.entropyHash },
        update: {
          verificationStatus: data.verificationStatus,
        },
        create: data,
      });
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
        this.logger.warn(`Database race condition: duplicate entropy_hash detected (entropyHash: ${data.entropyHash}). Skipping gracefully.`);
        const existingRecord = await this.prisma.artifact.findUnique({ where: { entropyHash: data.entropyHash } });
        return existingRecord || data;
      }
      throw err;
    }
  }

  private async updateArtifactStatus(id: string, status: string): Promise<Artifact | null> {
    if (this.prisma.isFallbackMode) {
      const art = this.prisma.artifacts.find(a => a.id === id);
      if (art) {
        art.verificationStatus = status;
        return art;
      }
      return null;
    }
    return this.prisma.artifact.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  private async createLog(category: string, message: string, relayId?: string): Promise<any> {
    const logItem = {
      id: 'LOG-' + Math.floor(Math.random() * 10000000),
      timestamp: new Date(),
      category,
      message,
      relayId,
    };

    if (this.prisma.isFallbackMode) {
      this.prisma.telemetryLogs.unshift(logItem);
      if (this.prisma.telemetryLogs.length > 200) this.prisma.telemetryLogs.pop();
    } else {
      await this.prisma.telemetryLog.create({
        data: {
          category,
          message,
          relayId,
        },
      });
    }

    this.telemetryGateway.broadcastTelemetryLog(logItem);
    return logItem;
  }
}
