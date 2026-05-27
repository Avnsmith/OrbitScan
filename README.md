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

1. **Verifiable Cosmic Entropy Provenance**:
   - Live integration with the official **@spacecomputer-io/orbitport-sdk-ts** to fetch orbital cTRNG randomness.
   - Resilient multi-tier fallback querying decentralized IPFS beacons, the Cloudflare **League of Entropy (drand)** public beacon, and secure local cryptographic generators (`crypto.randomBytes`) with precise telemetry source attribution.
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

## 🛰️ Production Data Flow & System Architecture

OrbitScan utilizes a multi-tier async ingestion engine ensuring at-least-once queue delivery guarantees and end-to-end idempotency under heavy downlink stress.

### Complete Data Flow Diagram

```mermaid
sequenceDiagram
    participant B as Live Beacon (SpaceComputer/drand)
    participant E as EntropyProviderService (NestJS)
    participant Q as BullMQ Telemetry Queue (Redis)
    participant W as TelemetryProcessor Worker (BullMQ)
    participant DB as PostgreSQL (Prisma ORM)
    participant WS as TelemetryGateway (Socket.io)
    participant UI as Next.js Client Console

    rect rgb(20, 24, 33)
        note right of E: 4s Tick Simulation Ingress Trigger
        E->>B: fetchEntropy() with requested bits
        alt Beacon is active & round is new
            B-->>E: Returns latest entropy payload (sequence/roundId)
        else Beacon has sequence already ingested
            E-->>E: Serves from local cache
        else Beacon is unreachable
            E-->>E: Cryptographic Local Fallback (crypto.randomBytes)
        end
    end

    E->>Q: Enqueue 'ingest-payload' with jobId = entropyHash
    note over Q: BullMQ prevents duplicates by locking on jobId

    Q->>W: Process 'ingest-payload'
    rect rgb(24, 28, 38)
        note over W: TelemetryProcessor Idempotency Check
        W->>DB: Check if entropy_hash exists
        alt entropy_hash is duplicate
            W-->>W: Skip and Log Warning (Return existing)
        else entropy_hash is new
            W->>DB: createArtifact() / upsert() PENDING state
            W->>WS: broadcastArtifactCreated()
            WS-->>UI: WebSocket Live Refresh
            W->>Q: Add 'verify-signature' with delay 3000ms & jobId
        end
    end

    Q->>W: Process 'verify-signature'
    W->>DB: updateArtifactStatus() to VERIFIED
    W->>WS: broadcastVerificationCompleted()
    WS-->>UI: Badge transitions to green "● VERIFIED"
```

### Real Production Ingestion Logs

The following live log trace demonstrates OrbitScan running in high-concurrency production mode with duplicate avoidance, telemetry locks, and fallback handlers:

```text
[Nest] 38  - 05/27/2026, 10:11:23 AM     LOG [PrismaService] Connecting to PostgreSQL database...
[Nest] 38  - 05/27/2026, 10:11:23 AM     LOG [PrismaService] Successfully connected to PostgreSQL database.
[Nest] 38  - 05/27/2026, 10:11:23 AM     LOG [SimulatorService] Starting Orbital Telemetry Ingestion Simulator...
[Nest] 38  - 05/27/2026, 10:11:23 AM     LOG [NestApplication] Nest application successfully started
[Nest] 38  - 05/27/2026, 10:11:23 AM     LOG [Bootstrap] 🛰️ OrbitScan API Gateway successfully launched on port 3001
[Nest] 38  - 05/27/2026, 10:11:27 AM     LOG [EntropyProviderService] Fetching live verifiable entropy from SpaceComputer IPFS beacon...
[Nest] 38  - 05/27/2026, 10:11:27 AM     LOG [EntropyProviderService] SpaceComputer beacon block #10421 ingested successfully (cTRNG: 0xa41c09bf...).
[Nest] 38  - 05/27/2026, 10:11:27 AM     LOG [TelemetryProcessor] Processing queue job: ingest-payload (ID: ART-912831)
[Nest] 38  - 05/27/2026, 10:11:27 AM    WARN [EntropyProviderService] Concurrent entropy request received. Reusing active ingestion fetch lock...
[Nest] 38  - 05/27/2026, 10:11:31 AM    WARN [TelemetryProcessor] Duplicate telemetry payload detected (entropyHash: 0xa41c09bf...). Skipping ingestion gracefully.
[Nest] 38  - 05/27/2026, 10:11:30 AM     LOG [TelemetryProcessor] Processing queue job: verify-signature (ID: verify-ART-912831)
[Nest] 38  - 05/27/2026, 10:11:30 AM     LOG [TelemetryProcessor] INTEGRITY ATTESTATION VERIFIED: Telemetry payload #ART-912831 signature verified successfully.
```

---

## 📦 Monorepo Architecture & Workspace Strategy

OrbitScan is structured as a production-grade npm workspaces monorepo to ensure strict type safety and prevent schema drift between backend telemetry ingestion services and frontend visualization consoles.

```text
/
├── packages
│   └── shared-types          # Centralized TS contracts & API payloads (dist/index.js, dist/index.d.ts)
├── orbitscan-backend         # NestJS Telemetry Ingest App
├── orbitscan-frontend        # Next.js 16 Telemetry Console
├── package.json              # Root workspace configuration
└── vercel.json               # Hardened Vercel monorepo deployment config
```

### 1. Centralized Typed Contracts (`@orbitscan/shared-types`)
All key schemas, interfaces, and DTO contracts are declared in a single source of truth at `packages/shared-types`. This includes:
- **`TelemetryPayload`**: Structure of telemetry data fetched from beacons.
- **`Artifact` & `VerificationProof`**: Cryptographic provenance schemas.
- **`RelayState` & `HealthStatus`**: Live component health parameters.
- **`SocketPayload`**: Type-safe WebSocket messaging interfaces.

Any change to the schemas in `@orbitscan/shared-types` propagates instantly, causing build-time compilation typechecks on both the frontend and backend, preventing runtime drift completely.

### 2. Consolidated Build Pipeline & Build Ordering
Local development, Vercel, and Railway all use a deterministic, sequential build order:
1. **Build Shared Package** (`tsc` compiles and outputs to `packages/shared-types/dist/`)
2. **Build Web Applications** (Next.js and NestJS compile using references to the built types)

This is executed using unified, workspace-aware root scripts:
- `npm run build:shared` — Compiles the shared types.
- `npm run build:frontend` — Compiles the Next.js frontend console.
- `npm run build:backend` — Compiles the NestJS backend API.
- `npm run build` — Runs the full sequence in order.

---

## 🚀 Technology Stack

### Backend Services
- **Framework**: NestJS (TypeScript)
- **Ecosystem SDK**: **@spacecomputer-io/orbitport-sdk-ts** (Official Orbitport SDK)
- **Database**: PostgreSQL (Prisma ORM)
- **Caching & Queues**: Redis & BullMQ
- **Verification**: Built-in crypto engines, decentralized IPFS beacon clients & drand fallbacks
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

### Step 3: Run Database Migrations & Code Generation

Generate the Prisma client and execute the migrations from the root using workspace commands:
```bash
npm run build:shared
npx prisma generate --schema=orbitscan-backend/prisma/schema.prisma
npx prisma migrate dev --name init --schema=orbitscan-backend/prisma/schema.prisma
```

### Step 4: Boot the Services

Run the development servers concurrently using workspace commands:

**Terminal 1: NestJS API Gateway**
```bash
npm run start:dev --workspace=orbitscan-backend
```

**Terminal 2: Next.js Client Console**
```bash
npm run dev --workspace=orbitscan-frontend
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
