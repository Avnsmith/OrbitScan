import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryGateway } from '../gateway/telemetry.gateway';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import * as crypto from 'crypto';

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private simulationInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryGateway: TelemetryGateway,
    @InjectQueue('telemetry-ingestion') private readonly telemetryQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Orbital Telemetry Ingestion Simulator...');
    this.logger.warn(
      '⚠️  [SIMULATION NOTICE]: OrbitScan is operating in telemetry simulation mode. ' +
      'All downlink parameters are processed in real-time using BullMQ queues.'
    );
    // Start simulation loop every 4 seconds
    this.simulationInterval = setInterval(() => this.runSimulationTick(), 4000);
  }

  onModuleDestroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }

  private async runSimulationTick() {
    try {
      const relays = await this.getRelays();
      if (relays.length === 0) return;

      const randomRelay = relays[Math.floor(Math.random() * relays.length)];
      
      // Degrade, offline or activate relays dynamically
      let newStatus = randomRelay.status;
      let newLatency = randomRelay.latency;
      let newSignal = randomRelay.signalIntegrity;

      if (randomRelay.id === 'RLY-Z5') {
        if (Math.random() < 0.1) {
          newStatus = 'ACTIVE';
          newLatency = 240 + Math.floor(Math.random() * 80);
          newSignal = 0.65 + Math.random() * 0.15;
        } else {
          newStatus = 'OFFLINE';
          newLatency = 999;
          newSignal = 0.00;
        }
      } else {
        const isDegrading = Math.random() < 0.05;
        const isRestoring = Math.random() < 0.1;
        
        if (isDegrading) {
          newStatus = 'DEGRADED';
          newLatency = 150 + Math.floor(Math.random() * 200);
          newSignal = 0.50 + Math.random() * 0.20;
        } else if (isRestoring && randomRelay.status === 'DEGRADED') {
          newStatus = 'ACTIVE';
          newLatency = 40 + Math.floor(Math.random() * 30);
          newSignal = 0.90 + Math.random() * 0.09;
        } else if (randomRelay.status === 'ACTIVE') {
          newLatency = Math.max(30, randomRelay.latency + (Math.random() < 0.5 ? -3 : 3));
          newSignal = Math.min(1.00, Math.max(0.85, randomRelay.signalIntegrity + (Math.random() < 0.5 ? -0.01 : 0.01)));
        }
      }

      // Save and broadcast relay update
      const updatedRelay = await this.updateRelay(randomRelay.id, {
        status: newStatus,
        latency: newLatency,
        signalIntegrity: Number(newSignal.toFixed(2)),
        lastSeen: new Date(),
      });

      this.telemetryGateway.broadcastRelayUpdated(updatedRelay);

      await this.createLog(
        'system',
        `Relay ${updatedRelay.name} (${updatedRelay.id}) telemetry updated. SNR Margin: ${(updatedRelay.signalIntegrity * 100).toFixed(0)}%, Latency: ${updatedRelay.latency}ms, Status: ${updatedRelay.status}`,
        updatedRelay.id
      );

      // Generate a Telemetry Attestation Event (70% probability per tick)
      if (Math.random() < 0.7 && updatedRelay.status !== 'OFFLINE') {
        await this.generateEntropyCycle(updatedRelay);
      }
    } catch (err) {
      this.logger.error('Error in simulation tick:', err);
    }
  }

  private async generateEntropyCycle(relay: any) {
    const bits = Math.random() < 0.3 ? 512 : 256;
    const entropyHash = '0x' + crypto.randomBytes(bits / 8).toString('hex');
    const sourceTypes = [
      'DOWNLINK_NOISE_PROFILE', 
      'THERMAL_SENSOR_VARIANCE', 
      'SOLAR_RADIATION_FLUX', 
      'SIGNAL_PROPAGATION_DRIFT'
    ];
    const source = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];
    const artifactId = 'ART-' + Math.floor(100000 + Math.random() * 900000);

    const entropyEvent = {
      timestamp: new Date(),
      relayId: relay.id,
      relayName: relay.name,
      bits,
      source,
      entropyHash,
      signalState: relay.signalIntegrity >= 0.9 ? 'STABLE' : relay.signalIntegrity >= 0.7 ? 'FLUCTUATING' : 'DEGRADED',
    };
    
    // Broadcast initial generation immediately
    this.telemetryGateway.broadcastEntropyGenerated(entropyEvent);
    
    await this.createLog(
      'entropy',
      `Telemetry Attestation Request Ingested: ${bits}-bit payload sourced from ${source.replace(/_/g, ' ')}`,
      relay.id
    );

    // Enqueue job into BullMQ queue. Resilient processing handles DB insertions and verification steps.
    await this.telemetryQueue.add('ingest-payload', {
      artifactId,
      entropyHash,
      bits,
      relayId: relay.id,
      source,
    });
  }

  // --- DB Abstraction Methods ---
  private async getRelays(): Promise<any[]> {
    if (this.prisma.isFallbackMode) {
      return this.prisma.relays;
    }
    return this.prisma.relay.findMany();
  }

  private async updateRelay(id: string, data: any): Promise<any> {
    if (this.prisma.isFallbackMode) {
      const index = this.prisma.relays.findIndex(r => r.id === id);
      if (index !== -1) {
        this.prisma.relays[index] = { ...this.prisma.relays[index], ...data };
        return this.prisma.relays[index];
      }
      return null;
    }
    return this.prisma.relay.update({
      where: { id },
      data,
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
