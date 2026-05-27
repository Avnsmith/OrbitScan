import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EntropyPayload {
  entropyHash: string;
  bits: number;
  source: string;
  metadata?: {
    beacon: string;
    sequence?: number;
    blockCid?: string;
    round?: number;
    signature?: string;
    verifiable: boolean;
    fetchedAt: string;
  };
}

// SpaceComputer public IPFS beacon — free, no credentials required
const SC_BEACON_URL =
  'https://ipfs.io/ipns/k2k4r8lvomw737sajfnpav0dpeernugnryng50uheyk1k39lursmn09f';

// Fallback to Cloudflare's public drand beacon
const DRAND_BEACON_URL = 'https://drand.cloudflare.com/public/latest';

@Injectable()
export class EntropyProviderService {
  private readonly logger = new Logger(EntropyProviderService.name);
  
  // Cache and locking state
  private cachedPayload: EntropyPayload | null = null;
  private lastIngestedRound: number | null = null;
  private isFetching = false;
  private fetchPromise: Promise<EntropyPayload> | null = null;

  async fetchEntropy(requestedBits: number): Promise<EntropyPayload> {
    // If a fetch is already running, reuse the active promise (concurrency locking)
    if (this.isFetching && this.fetchPromise) {
      this.logger.log('Concurrent entropy request received. Reusing active ingestion fetch lock...');
      return this.fetchPromise;
    }

    this.isFetching = true;
    this.fetchPromise = this.doFetchEntropy(requestedBits)
      .finally(() => {
        this.isFetching = false;
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  private async doFetchEntropy(requestedBits: number): Promise<EntropyPayload> {
    // Try SpaceComputer IPFS beacon first (always free, public)
    try {
      this.logger.log('Fetching live verifiable entropy from SpaceComputer IPFS beacon...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(SC_BEACON_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SpaceComputer IPFS HTTP ${response.status}`);
      }

      const raw = await response.json();

      // Validate shape
      if (
        !raw?.data?.ctrng ||
        !Array.isArray(raw.data.ctrng) ||
        raw.data.ctrng.length === 0
      ) {
        throw new Error('Unexpected SpaceComputer beacon block shape');
      }

      const sequence = raw.data.sequence;

      // Prevent repeated ingestion of the same round/sequence ID
      if (this.lastIngestedRound !== null && sequence <= this.lastIngestedRound && this.cachedPayload) {
        this.logger.debug(`SpaceComputer sequence #${sequence} already ingested. Serving cached payload.`);
        return {
          ...this.cachedPayload,
          bits: requestedBits,
        };
      }

      // Pick the first ctrng hex
      const hexValue = raw.data.ctrng[0];
      const scaledHex = this.scaleHex(hexValue, requestedBits);

      const payload: EntropyPayload = {
        entropyHash: '0x' + scaledHex,
        bits: requestedBits,
        source: 'SPACECOMPUTER_IPFS',
        metadata: {
          beacon: 'SpaceComputer Orbital cTRNG Beacon',
          sequence: sequence,
          blockCid: raw.previous,
          verifiable: true,
          fetchedAt: new Date().toISOString(),
        },
      };

      // Populate cache
      this.cachedPayload = payload;
      this.lastIngestedRound = sequence;

      this.logger.log(
        `SpaceComputer beacon block #${sequence} ingested successfully (cTRNG: ${hexValue.slice(0, 10)}...).`,
      );

      return payload;
    } catch (scError) {
      const scMsg = scError instanceof Error ? scError.message : String(scError);
      this.logger.warn(
        `SpaceComputer IPFS beacon unreachable (${scMsg}). Falling back to drand beacon...`,
      );

      // Fallback 1: drand beacon (Cloudflare public latest)
      try {
        this.logger.log('Fetching live verifiable entropy from drand public latest beacon...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(DRAND_BEACON_URL, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`drand HTTP error ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data.randomness !== 'string') {
          throw new Error('Invalid response structure from drand public beacon');
        }

        const round = data.round;

        // Prevent repeated ingestion of the same round ID
        if (this.lastIngestedRound !== null && round <= this.lastIngestedRound && this.cachedPayload) {
          this.logger.debug(`drand round #${round} already ingested. Serving cached payload.`);
          return {
            ...this.cachedPayload,
            bits: requestedBits,
          };
        }

        let randomness = data.randomness;
        if (!randomness.startsWith('0x')) {
          randomness = '0x' + randomness;
        }

        const payload: EntropyPayload = {
          entropyHash: randomness,
          bits: 256,
          source: 'LIVE_DRAND_BEACON',
          metadata: {
            beacon: 'League of Entropy (Cloudflare drand)',
            round: round,
            signature: data.signature,
            verifiable: true,
            fetchedAt: new Date().toISOString(),
          },
        };

        this.cachedPayload = payload;
        this.lastIngestedRound = round;

        this.logger.log(`Successfully ingested live entropy from drand round #${round}.`);
        return payload;

      } catch (drandError) {
        const drandMsg = drandError instanceof Error ? drandError.message : String(drandError);
        this.logger.warn(
          `drand beacon unreachable (${drandMsg}). Using cryptographic local fallback.`,
        );
        return this.localFallback(requestedBits);
      }
    }
  }

  private scaleHex(hex: string, bits: number): string {
    const targetBytes = Math.ceil(bits / 8);
    const doubleHex = hex + hex; // Max 512-bit source
    return doubleHex.substring(0, targetBytes * 2);
  }

  private localFallback(requestedBits: number): EntropyPayload {
    const bytes = Math.ceil(requestedBits / 8);
    const entropyHash = '0x' + crypto.randomBytes(bytes).toString('hex');

    return {
      entropyHash,
      bits: requestedBits,
      source: 'LOCAL_CRYPTO_FALLBACK',
      metadata: {
        beacon: 'Node.js crypto.randomBytes (SpaceComputer & drand beacons unreachable)',
        verifiable: false,
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}
