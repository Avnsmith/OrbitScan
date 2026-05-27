# 🛰️ OrbitScan — Enterprise Orbital Explorer

OrbitScan is an enterprise-grade Mission Control console and telemetry explorer for space-bound systems. Designed to operate like institutional infrastructure (comparable to Bloomberg Terminal, Palantir, and aerospace telemetry consoles), it features a high-density graphite palette, orbital cyan telemetry vectors, and sub-millisecond status tickers.

---

> [!IMPORTANT]
> **SIMULATOR DISCLOSURE & MODE NOTICE**
> OrbitScan is currently configured in **Telemetry Simulation Mode**. 
> * Real-time orbital packet arrivals, downlinks, and attestation cycles are simulated using a background generator.
> * Telemetry ingestion pipelines utilize **real Redis databases and BullMQ queues** to process jobs.
> * Database persistence is active via PostgreSQL (Prisma). A safe in-memory fallback is automatically used in local development if no connection is active.
> * In production (`NODE_ENV=production`), startup strictly **fails** if PostgreSQL or Redis are unavailable.

---

## 🏗️ Core Architecture & Pipeline

```text
               [Downlink Satellite Relays]
                           │
             (Real-time Ingestion Event Tick)
                           │
                           ▼
                  [NestJS API Gateway]
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
  (BullMQ Job Queue)             (REST Controller)
   └─ [Redis Store]                ├─ ApiKeyGuard
           │                       └─ ThrottlerGuard
    (Background Worker)                    │
   └─ Attestation Processing               ▼
           │                         [PostgreSQL]
           ▼
  [Socket.io WebSocket]
   └─ Handshake Verification
           │
           ▼
    [Next.js Client]
     └─ Zustand ring buffer
     └─ Continuous Waveform
```

### 🛡️ Enterprise Engineering Patterns Included
1.  **Job Processing Queue (Redis + BullMQ)**: Background attestation processing and payload ingestion tasks are enqueued into a real Redis queue and digested by dedicated workers.
2.  **API Rate Limiting & Defense**: REST endpoints and WebSockets are rate-limited via `@nestjs/throttler` to prevent link-exhaustion attacks.
3.  **Credentialed Handshakes**: All REST queries and WebSocket feeds require authenticated queries using a secure API Key (`ORBIT_DEV_KEY_2026`).
4.  **Hydration & Render Optimization**: Next.js hydration issues are mitigated using client-side mount guards. Waveform canvases use a decoupled continuous animation frame (RAF) avoiding frequent thread stutters.

---

## 🚀 Quick Start Guide

### Step 1: Spin up Postgres & Redis Stack
OrbitScan requires real database and memory queue adapters. Initialize the containerized services:
```bash
docker-compose up -d
```
*Verify they are running on local ports `5432` and `6379`.*

### Step 2: Configure & Start API Gateway (Backend)
```bash
cd orbitscan-backend
# Copy and configure environment variables
cp .env.example .env
# Start NestJS service in watch mode
npm run start:dev
```
*Note: In development mode, the backend gracefully falls back to local sqlite/in-memory adapters if PostgreSQL is absent.*

### Step 3: Launch Mission Control Client (Frontend)
```bash
cd orbitscan-frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## ⚙️ Environment Variables Configuration

### Backend (`orbitscan-backend/.env`)
*   `DATABASE_URL`: Connection string for PostgreSQL database.
*   `REDIS_HOST`: Host location of Redis server (`localhost`).
*   `REDIS_PORT`: Port number of Redis server (`6379`).
*   `PORT`: Gateway execution port (`3001`).
*   `API_KEY`: Secret string required for client auth handshakes (`ORBIT_DEV_KEY_2026`).

---

## 🛰️ Authenticated API Index & Streams

All endpoints require an authenticated connection. Provide the key in the `x-api-key` header or as a query parameter `?apiKey=...`.

### REST Endpoints (`http://localhost:3001`)
*   `GET /health` - Diagnostic state returns PostgreSQL connectivity, Redis latency, and memory consumption.
*   `GET /artifacts` - List latest telemetry attestation payloads.
*   `GET /artifact/:id` - Fetch comprehensive artifact metrics & signature attestations.
*   `GET /relays` - Retrieve current satellite relay drifts and signal levels.
*   `GET /metrics` - Fetch aggregated institutional statistics (throughput, averages, verified counts).

### WebSocket Stream (`http://localhost:3001` via Socket.io)
Pass credentials during WebSocket connection establishment:
```javascript
const socket = io('http://localhost:3001', {
  query: { token: 'ORBIT_DEV_KEY_2026' }
});
```

*   `relay.updated` - Broadcasts SNR link drifts and latency updates.
*   `entropy.generated` - Dispatched on new attestation arrivals.
*   `artifact.created` - Sourced when a payload is successfully queued and registered.
*   `verification.completed` - Dispatched when workers verify attestation roots and apply signatures.
*   `telemetry.log` - Sourced for system-wide chronological event stream.

---

## 🛠️ Telemetry Terminology Correctives
All sci-fi block/web3 jargon has been removed and replaced with physical operational variables:
*   **Downlink Noise Profile** (instead of cosmic ray anomalies).
*   **Thermal Sensor Variance** (instead of magnetospheric noise).
*   **Signal Propagation Drift** (instead of ionospheric jitter).
*   **Integrity Attestation Enclaves** (instead of trust verification validators).
*   **Signal Degradation** (instead of system dilution).

---

## 🗺️ Production Roadmap
1.  [ ] **Hardware TRNG Module**: Integrate physical hardware random-generator serial interfaces (USB) into the ingestion thread.
2.  [ ] **Telemetry Attestations**: Replace simulated deterministic hashes with real ECDSA payload validations using SpaceComputer PKI.
3.  [ ] **CCSDS Packet Decoding**: Build binary parsers in NestJS to process real satellite downlink streams directly.
