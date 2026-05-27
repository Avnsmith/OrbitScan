import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isFallbackMode = false;

  // In-memory fallback database
  public artifacts: any[] = [];
  public relays: any[] = [];
  public telemetryLogs: any[] = [];

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to PostgreSQL database...');
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database.');
      // Pre-seed some default relays
      await this.seedDefaultRelays();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('CRITICAL: Failed to connect to PostgreSQL database in PRODUCTION mode. Process aborting.');
        throw error;
      }
      this.isFallbackMode = true;
      this.logger.warn(
        `Failed to connect to database at ${process.env.DATABASE_URL}. ` +
        `OrbitScan backend will automatically run in [In-Memory Fallback Mode] for local testing.`
      );
      this.seedInMemoryDefaultRelays();
    }
  }

  async onModuleDestroy() {
    if (!this.isFallbackMode) {
      await this.$disconnect();
    }
  }

  private async seedDefaultRelays() {
    const defaultRelays = [
      { id: 'RLY-A1', name: 'Aetheris-1', status: 'ACTIVE', latency: 45, uptime: 99.98, signalIntegrity: 0.98 },
      { id: 'RLY-B2', name: 'Boreas-2', status: 'ACTIVE', latency: 68, uptime: 99.85, signalIntegrity: 0.95 },
      { id: 'RLY-H3', name: 'Helios-3', status: 'DEGRADED', latency: 185, uptime: 98.42, signalIntegrity: 0.72 },
      { id: 'RLY-N4', name: 'Nyx-4', status: 'ACTIVE', latency: 55, uptime: 99.91, signalIntegrity: 0.96 },
      { id: 'RLY-Z5', name: 'Zephyrus-5', status: 'OFFLINE', latency: 999, uptime: 95.14, signalIntegrity: 0.00 },
    ];

    for (const relay of defaultRelays) {
      await this.relay.upsert({
        where: { id: relay.id },
        update: {},
        create: relay,
      });
    }
    this.logger.log('PostgreSQL default relays seeded successfully.');
  }

  private seedInMemoryDefaultRelays() {
    this.relays = [
      { id: 'RLY-A1', name: 'Aetheris-1', status: 'ACTIVE', latency: 45, uptime: 99.98, signalIntegrity: 0.98, lastSeen: new Date() },
      { id: 'RLY-B2', name: 'Boreas-2', status: 'ACTIVE', latency: 68, uptime: 99.85, signalIntegrity: 0.95, lastSeen: new Date() },
      { id: 'RLY-H3', name: 'Helios-3', status: 'DEGRADED', latency: 185, uptime: 98.42, signalIntegrity: 0.72, lastSeen: new Date() },
      { id: 'RLY-N4', name: 'Nyx-4', status: 'ACTIVE', latency: 55, uptime: 99.91, signalIntegrity: 0.96, lastSeen: new Date() },
      { id: 'RLY-Z5', name: 'Zephyrus-5', status: 'OFFLINE', latency: 999, uptime: 95.14, signalIntegrity: 0.00, lastSeen: new Date() },
    ];
    this.logger.log('In-Memory default relays seeded successfully.');
  }
}
