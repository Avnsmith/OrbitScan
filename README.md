# OrbitScan — Enterprise Orbital Telemetry & Entropy Provenance Explorer

OrbitScan is a next-generation explorer and observability platform for the SpaceComputer ecosystem. Designed for operators, engineers, and telemetry analysts, it provides a high-density, mission-control dashboard to inspect orbital downlink properties, track signal propagation drifts, verify cryptographic attestations, and monitor verifiable entropy provenance from live and simulated sources.

This repository implements a production-hardened, low-latency telemetry ingestion pipeline backed by real-world databases and queue processors.

---

## 🛰️ Product Identity & Architecture

OrbitScan is built with a deep commitment to high-density, institutional aesthetics (inspired by Bloomberg Terminals, Palantir, and aerospace operations consoles) and zero superficial hype.

```
                  +-----------------------------------+
                  |      Browser Clients / Console    |
                  +-----------------+-----------------+
                                    | HTTP / WebSockets
                                    v
                  +-----------------+-----------------+
                  |      Explorer API Gateway         |
                  |          (NestJS App)             |
                  +--------+-----------------+--------+
                           |                 |
         Ingestion Job     v                 v    Verify / Persist
     +---------------------+----+       +----+---------------------+
     |  BullMQ Telemetry Queue  |       |    PostgreSQL Database   |
     |      (Redis Backed)      |       |      (Prisma Client)     |
     +---------------------+----+       +--------------------------+
                           |
                           v
     +---------------------+----+
     |    Telemetry Worker      |
     |   (Signature Engine)     |
     +--------------------------+
```

---

## 🛠️ Key Technical Features

1. **verifiable Entropy Provenance**:
   - Live integration with the Cloudflare **League of Entropy (drand)** public randomness beacon.
   - Robust timeout abort limits (1.8s), local memory caches, and resilient automatic cryptographic fallback modes (`crypto.randomBytes`) with precise telemetry source attribution.
2. **Resilient Background Processing**:
   - Employs **BullMQ** and **Redis** to ingest and process telemetry payloads.
   - Deploys multi-stage verification jobs: parses payload parameters, inserts telemetry logs, schedules delayed attestation validation workers, and manages real-time broadcast state.
3. **High-Density Real-Time UI**:
   - Engineered in **Next.js 16 (Turbopack)** and **React 19**.
   - Features a 60fps canvas waveform visualizer running on a decoupled, non-reactive animation loop utilizing mutable references to prevent React hydration or rendering stutters.
   - Custom timezone-safe date-string mounting hooks to avoid hydration mismatches.
4. **Secure Ingestion & Access Controls**:
   - Protected API gateways using `@nestjs/throttler` limits.
   - Request verification checking headers and query strings via `x-api-key`.
   - Handshake checks for live WebSocket listeners.
5. **System Health & Observability**:
   - `GET /health` diagnostic endpoints verifying real-time database, Redis connectivity, and queue threads.
   - Explicit console warnings and visible simulator disclosure banners.

---

## 📸 Production Console Mockup

![OrbitScan Telemetry Console Mockup](docs/screenshots/dashboard.png)

---

## 🚀 Technology Stack

### Backend Services
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (Prisma ORM)
- **Caching & Queues**: Redis & BullMQ
- **Verification**: Built-in crypto engines & drand Client
- **Security**: @nestjs/throttler, custom Guards

### Frontend Console
- **Framework**: Next.js 16 (App Router), React 19
- **State Management**: Zustand (Memory-efficient ring buffers)
- **Styling**: TailwindCSS & custom vanilla CSS variables
- **Animations**: Framer Motion
- **Visuals**: HTML5 Canvas (60fps rendering), Recharts

---

## 📦 Local Development Setup

### Prerequisites
- Node.js (v20+ recommended)
- Docker & Docker Compose (for Postgres and Redis services)

### Step 1: Clone and Configure Environment

Clone the repository:
```bash
git clone https://github.com/Avnsmith/OrbitScan.git
cd OrbitScan
```

Copy the `.env.example` configurations to `.env` in both packages.

**For `orbitscan-backend` (.env)**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/orbitscan?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
PORT=3001
CORS_ORIGIN="http://localhost:3000"
API_KEY="ORBIT_DEV_KEY_2026"
```

**For `orbitscan-frontend` (.env)**:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

### Step 2: Spin Up Infrastructure Containers

Use the provided docker-compose configuration to boot local Postgres and Redis databases:
```bash
docker-compose up -d
```

### Step 3: Run Database Migrations

Navigate to the backend package, generate the client, and run the prisma migrations:
```bash
cd orbitscan-backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### Step 4: Boot the Services

Open two terminals and start development servers:

**Terminal 1: NestJS API Gateway**
```bash
cd orbitscan-backend
npm run start:dev
```

**Terminal 2: Next.js Client Console**
```bash
cd orbitscan-frontend
npm install
npm run dev
```

Visit the console at **`http://localhost:3000`** in your browser.

---

## 🌐 Production Deployment

OrbitScan is fully operational in production.

- **Frontend Environment Variables on Vercel**:
  - `NEXT_PUBLIC_API_URL` -> Assigned Railway URL
  - `NEXT_PUBLIC_WS_URL` -> Assigned Railway URL
- **Backend Environment Variables on Railway**:
  - `DATABASE_URL` -> Bound PostgreSQL connection URL
  - `REDIS_HOST` -> Bound Redis host
  - `REDIS_PORT` -> Bound Redis port
  - `REDIS_PASSWORD` -> Bound Redis password
  - `PORT` -> 3001
  - `API_KEY` -> Custom token key

---

## 🔒 Security & Resilience Design

1. **Strict Production Enforcement**: Fallback memory modes are strictly blocked in production. If `NODE_ENV === 'production'`, database connection failures instantly crash the backend process during bootstrap to avoid silent operational degradation.
2. **WebSocket Handshake Validation**: Live telemetry socket streams enforce initial query token checks before accepting connection upgrades.
3. **Throttling Guard**: High-density clients are throttled on REST routes to protect database threads.

---

## 🗺️ Roadmap & Ecosystem Future

- **OpenTelemetry Integrations**: Export trace spans and metrics directly to Prometheus/Grafana.
- **Hardware Telemetry Interfaces**: Connect directly to physical Radio / Satellite telemetry hardware signals.
- **Structured JSON Ingestion**: Connect output streams to ELK stacks via Pino/Winston logging.
- **Multi-Signature Attestation Engines**: Implement distributed consensus protocols for entropy verification blocks.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
