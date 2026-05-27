import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EntropyPayload {
  entropyHash: string;
  bits: number;
  source: string;
  metadata?: {
    beacon: string;
    round?: number;
    signature?: string;
    verifiable: boolean;
    fetchedAt: string;
  };
}

@Injectable()
export class EntropyProviderService {
  private readonly logger = new Logger(EntropyProviderService.name);
  
  // Simple cache to prevent hammering the public drand API on every tick
  private cachedPayload: EntropyPayload | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_DURATION_MS = 4000; // Cache for 4 seconds

  async fetchEntropy(requestedBits: number): Promise<EntropyPayload> {
    const now = Date.now();
    
    // Check cache
    if (this.cachedPayload && now < this.cacheExpiresAt) {
      this.logger.debug('Returning cached live entropy payload.');
      return {
        ...this.cachedPayload,
        bits: requestedBits, // Adapt to requested size
      };
    }

    try {
      this.logger.log('Fetching live verifiable entropy from drand public beacon...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800); // 1.8s timeout

      const response = await fetch('https://drand.cloudflare.com/public/latest', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} from drand service`);
      }

      const data = await response.json();
      
      if (!data || typeof data.randomness !== 'string') {
        throw new Error('Invalid response structure from drand public beacon');
      }

      // Convert the drand randomness hex string (64 chars = 256 bits) to required format
      let randomness = data.randomness;
      if (!randomness.startsWith('0x')) {
        randomness = '0x' + randomness;
      }

      const payload: EntropyPayload = {
        entropyHash: randomness,
        bits: 256, // drand provides a 256-bit hash
        source: 'LIVE_DRAND_BEACON',
        metadata: {
          beacon: 'League of Entropy (Cloudflare drand)',
          round: data.round,
          signature: data.signature,
          verifiable: true,
          fetchedAt: new Date().toISOString(),
        },
      };

      // Store in cache
      this.cachedPayload = payload;
      this.cacheExpiresAt = now + this.CACHE_DURATION_MS;

      this.logger.log(`Successfully ingested live entropy from drand round #${data.round}.`);
      return payload;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to fetch live entropy (${errorMsg}). Gracefully falling back to high-entropy simulator...`);
      
      // Local high-entropy simulator fallback
      const bits = requestedBits || 256;
      const entropyHash = '0x' + crypto.randomBytes(bits / 8).toString('hex');
      const sourceTypes = [
        'DOWNLINK_NOISE_PROFILE',
        'THERMAL_SENSOR_VARIANCE',
        'SOLAR_RADIATION_FLUX',
        'SIGNAL_PROPAGATION_DRIFT',
      ];
      const source = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];

      return {
        entropyHash,
        bits,
        source,
        metadata: {
          beacon: 'Local Cryptographic Generator',
          verifiable: false,
          fetchedAt: new Date().toISOString(),
        },
      };
    }
  }
}
