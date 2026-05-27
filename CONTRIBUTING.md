# Contributing to OrbitScan

Thank you for your interest in contributing to OrbitScan! We welcome contributions from the community to help harden and extend this telemetry infrastructure.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful, professional, and collaborative.
- Prioritize technical correctness, security, and performance.
- Focus on high-fidelity, production-ready implementations.

## Development Workflow

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL
- Redis
- Railway CLI (for production/staging operations)
- Vercel CLI (for frontend operations)

### Local Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Avnsmith/OrbitScan.git
   cd OrbitScan
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` in both folders and update connection URLs:
   - For backend: `orbitscan-backend/.env`
   - For frontend: `orbitscan-frontend/.env`

3. **Install Dependencies**:
   ```bash
   # In root directory or separate subfolders
   cd orbitscan-backend && npm install
   cd ../orbitscan-frontend && npm install
   ```

4. **Initialize Database and Migrations**:
   ```bash
   cd orbitscan-backend
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start Development Services**:
   - Backend: `npm run start:dev` (runs on `localhost:3001` by default)
   - Frontend: `npm run dev` (runs on `localhost:3000` by default)

## Pull Request Guidelines

1. **Keep it Hardened**: We do not accept mock components or superficial "hype" features. Any telemetry or cryptographic implementations must be technically honest and fully operational.
2. **Type Safety**: TypeScript strict mode is enabled in both projects. Ensure your contributions have zero compiler warnings or errors.
3. **No Secrets**: Never commit any keys, connection strings, or production `.env` files. We enforce strict `.gitignore` configurations.
4. **Style**: Follow standard Prettier and ESLint formats (provided in configurations). Run `npm run lint` and `npm run format` prior to opening a PR.

## Getting Help

If you encounter issues, feel free to open a GitHub Issue or reach out to the core engineering team.
