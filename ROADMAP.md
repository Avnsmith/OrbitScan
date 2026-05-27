# OrbitScan Development & Hardening Roadmap

This document outlines the engineering path to scale OrbitScan from an enterprise MVP into a distributed telemetry provenance infrastructure platform.

## Phase 1: Local Core & Hardening (Completed)
- [x] aerospace telemetry terminology realism (downlink noise, propagation drifts, etc.)
- [x] Real-time BullMQ background job processing with Redis queue threads
- [x] Strict PostgreSQL production failover constraints
- [x] Zod-based environment variable validation at startup
- [x] WebSocket authentication handshake layer
- [x] Protected REST rate limiting and traffic throttling
- [x] System observability health diagnostics endpoint (`GET /health`)
- [x] Elegant telemetry simulation disclosures

## Phase 2: Live Integrations (Completed)
- [x] Abstract `EntropyProvider` interface
- [x] Real-world integration with **League of Entropy (drand)** public beacon
- [x] Robust timeout aborts, caching, and automatic cryptographically secure local fallback mode
- [x] Live vs Simulated UI badges in explorer dashboard and artifact page

## Phase 3: Enterprise Observability & Trace Logging (Q3 2026)
- [ ] **OpenTelemetry Integration**: Export backend metrics, trace spans, and database execution spans directly to Prometheus/Grafana or Datadog.
- [ ] **Structured JSON Logger**: Move NestJS default logging to structured Pino/Winston JSON streams to facilitate ingestion by Elasticsearch, Logstash, or Loki.
- [ ] **Relay Signal Performance Tracing**: Track long-term latency trends, signal degradation, and jitter values across historical intervals.

## Phase 4: Multi-Node Ingestion & Hardware Integrity (Q4 2026)
- [ ] **Distributed Ingestion Gateways**: Support ingestion endpoints across multiple geographically separated nodes with cryptographic signatures.
- [ ] **SpaceComputer / Orbitport Hardware Hook**: Connect directly to physical orbital payload radios and satellite hardware downlink signals.
- [ ] **Verifiable Signature Engines**: Introduce multi-signature attestation protocols to confirm entropy block roots.
