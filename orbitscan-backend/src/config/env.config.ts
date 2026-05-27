import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().or(z.number()).transform((val) => parseInt(val.toString(), 10)).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  PORT: z.string().or(z.number()).transform((val) => parseInt(val.toString(), 10)).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_KEY: z.string().default("ORBIT_DEV_KEY_2026"),
  // Optional: Orbitport API credentials for authenticated SpaceComputer access
  // If not set, the system uses the free public IPFS beacon (fully functional)
  ORBITPORT_CLIENT_ID: z.string().optional(),
  ORBITPORT_CLIENT_SECRET: z.string().optional(),
  // Frontend origin for CORS lockdown in production
  ALLOWED_ORIGIN: z.string().default("*"),
});

export const env = (() => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  return result.data;
})();
