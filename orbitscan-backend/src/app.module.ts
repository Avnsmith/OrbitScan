import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TelemetryGateway } from './gateway/telemetry.gateway';
import { SimulatorService } from './simulator/simulator.service';
import { ExplorerController } from './explorer/explorer.controller';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { TelemetryProcessor } from './simulator/telemetry.processor';
import { EntropyProviderService } from './simulator/entropy-provider.service';
import { env } from './config/env.config';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRoot({
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({
      name: 'telemetry-ingestion',
    }),
  ],
  controllers: [ExplorerController],
  providers: [
    TelemetryGateway,
    SimulatorService,
    TelemetryProcessor,
    EntropyProviderService,
  ],
})
export class AppModule {}
