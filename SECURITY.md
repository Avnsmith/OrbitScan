# Security Policy

We take the security of OrbitScan, its telemetry pipelines, and its cryptographic attestation models very seriously. If you believe you have discovered a vulnerability, please report it to us responsibly.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, please send all security disclosures directly to our core security team:
- **Email**: `security@orbitscan.io` (or the repository maintainer email `avnsmith@gmail.com`)

To help us investigate, please include:
- A detailed description of the vulnerability.
- Steps to reproduce or proof-of-concept (PoC) code.
- Potential impact and suggested mitigations if available.

We will acknowledge receipt of your report within 48 hours and work with you to coordinate a patch and responsible disclosure timeline.

## Security Defaults in OrbitScan

OrbitScan is hardened out-of-the-box with several production-ready security layers:
1. **Strict Production Enforcement**: The backend process crashes instantly on startup if a connection to a real, live PostgreSQL instance fails while `NODE_ENV` is set to `production`. Simulated fallback mode is strictly blocked.
2. **API Rate Limiting**: All REST endpoints are protected by `@nestjs/throttler` to prevent abuse.
3. **Websocket Handshake Verification**: Sockets must supply a valid `token` during the initial connection handshake or they are immediately rejected.
4. **Endpoint Protection**: Crucial diagnostic endpoints (such as `GET /health`) are protected by an `ApiKeyGuard` requiring valid query parameters or `x-api-key` headers.
