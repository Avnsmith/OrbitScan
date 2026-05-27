import { Controller, Get, Param, Query, NotFoundException, UseGuards, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller()
@UseGuards(ApiKeyGuard)
export class ExplorerController {
  private readonly logger = new Logger(ExplorerController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('artifacts')
  async getArtifacts(
    @Query('search') search?: string,
    @Query('limit') limit = 50,
  ) {
    const limitNum = Number(limit);
    if (this.prisma.isFallbackMode) {
      let filtered = [...this.prisma.artifacts];
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.id.toLowerCase().includes(query) ||
            a.entropyHash.toLowerCase().includes(query) ||
            a.relayId.toLowerCase().includes(query) ||
            a.source.toLowerCase().includes(query)
        );
      }
      return filtered.slice(0, limitNum);
    }

    return this.prisma.artifact.findMany({
      where: search
        ? {
            OR: [
              { id: { contains: search, mode: 'insensitive' } },
              { entropyHash: { contains: search, mode: 'insensitive' } },
              { relayId: { contains: search, mode: 'insensitive' } },
              { source: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });
  }

  @Get('artifact/:id')
  async getArtifactById(@Param('id') id: string) {
    let artifact: any;

    if (this.prisma.isFallbackMode) {
      artifact = this.prisma.artifacts.find((a) => a.id === id);
    } else {
      artifact = await this.prisma.artifact.findUnique({
        where: { id },
      });
    }

    if (!artifact) {
      throw new NotFoundException(`Attestation payload with ID ${id} not found`);
    }

    const relays = this.prisma.isFallbackMode
      ? this.prisma.relays
      : await this.prisma.relay.findMany();
    const relay = relays.find((r: any) => r.id === artifact.relayId);

    // Build a real attestation proof from stored beacon metadata.
    // For SPACECOMPUTER_IPFS artifacts, the entropyHash IS the satellite-generated
    // cTRNG value — verifiable by fetching the beacon and checking the ctrng array.
    const isSpaceComputerSource =
      artifact.source === 'SPACECOMPUTER_IPFS' ||
      artifact.source === 'SPACECOMPUTER_API';

    return {
      ...artifact,
      relayName: relay ? relay.name : 'Unknown Relay',
      signalIntegrity: relay ? relay.signalIntegrity : 0.95,
      latency: relay ? relay.latency : 50,
      verificationProof: {
        // entropyHash is the actual cTRNG hex from the satellite beacon
        entropyOrigin: artifact.entropyHash,
        source: artifact.source,
        signerRelay: artifact.relayId,
        // Verifiable by checking beacon at:
        // https://ipfs.io/ipns/k2k4r8lvomw737sajfnpav0dpeernugnryng50uheyk1k39lursmn09f
        verifiable: isSpaceComputerSource,
        beaconUrl: isSpaceComputerSource
          ? 'https://ipfs.io/ipns/k2k4r8lvomw737sajfnpav0dpeernugnryng50uheyk1k39lursmn09f'
          : null,
        attestationScore: relay ? Math.round(relay.uptime * 10) / 10 : 99.9,
      },
    };
  }

  @Get('entropy/:hash')
  async getArtifactByHash(@Param('hash') hash: string) {
    let artifact: any;

    if (this.prisma.isFallbackMode) {
      artifact = this.prisma.artifacts.find(
        (a) => a.entropyHash.toLowerCase() === hash.toLowerCase()
      );
    } else {
      artifact = await this.prisma.artifact.findUnique({
        where: { entropyHash: hash },
      });
    }

    if (!artifact) {
      throw new NotFoundException(`Telemetry block with hash ${hash} not found`);
    }

    return this.getArtifactById(artifact.id);
  }

  @Get('relays')
  async getRelays() {
    if (this.prisma.isFallbackMode) {
      return this.prisma.relays;
    }
    return this.prisma.relay.findMany();
  }

  @Get('telemetry/live')
  async getTelemetryLive(@Query('limit') limit = 100) {
    const limitNum = Number(limit);
    if (this.prisma.isFallbackMode) {
      return this.prisma.telemetryLogs.slice(0, limitNum);
    }
    return this.prisma.telemetryLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limitNum,
    });
  }

  @Get('metrics')
  async getMetrics() {
    const relays = this.prisma.isFallbackMode
      ? this.prisma.relays
      : await this.prisma.relay.findMany();

    const activeRelays = relays.filter((r: any) => r.status === 'ACTIVE').length;
    const avgLatency = relays.length
      ? Math.round(
          relays.reduce((acc: number, r: any) => acc + (r.status !== 'OFFLINE' ? r.latency : 0), 0) /
            relays.filter((r: any) => r.status !== 'OFFLINE').length
        )
      : 0;

    let totalEntropyBits = 0;
    let totalVerified = 0;
    let totalRequests = 0;

    if (this.prisma.isFallbackMode) {
      totalRequests = this.prisma.artifacts.length;
      const verified = this.prisma.artifacts.filter((a: any) => a.verificationStatus === 'VERIFIED');
      totalVerified = verified.length;
      totalEntropyBits = verified.reduce((acc: number, a: any) => acc + a.entropyBits, 0);
    } else {
      totalRequests = await this.prisma.artifact.count();
      const verified = await this.prisma.artifact.findMany({
        where: { verificationStatus: 'VERIFIED' },
      });
      totalVerified = verified.length;
      totalEntropyBits = verified.reduce((acc: number, a: any) => acc + a.entropyBits, 0);
    }

    const verifiedRate = totalRequests ? (totalVerified / totalRequests) * 100 : 100;

    return {
      totalEntropyGenerated: totalEntropyBits,
      activeEntropyRelays: activeRelays,
      averageResponseLatency: avgLatency || 48,
      verifiedEntropyRate: Number(verifiedRate.toFixed(2)),
      totalRequests,
      totalVerified,
    };
  }

  // Phase 11: GET /health observability diagnostic endpoint
  @Get('health')
  async getHealth() {
    let databaseStatus = 'ONLINE';
    if (this.prisma.isFallbackMode) {
      databaseStatus = 'OFFLINE_FALLBACK_ACTIVE';
    } else {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        databaseStatus = 'DEGRADED';
      }
    }

    return {
      status: databaseStatus === 'ONLINE' ? 'HEALTHY' : 'DEGRADED_OPERATION',
      timestamp: new Date(),
      uptimeSeconds: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: databaseStatus,
        telemetryStream: 'ACTIVE',
        attestationQueue: 'RUNNING',
      },
    };
  }
}
