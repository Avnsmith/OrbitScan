-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "entropy_hash" TEXT NOT NULL,
    "entropy_bits" INTEGER NOT NULL,
    "relay_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency" INTEGER NOT NULL,
    "uptime" DOUBLE PRECISION NOT NULL,
    "signal_integrity" DOUBLE PRECISION NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relay_id" TEXT,

    CONSTRAINT "telemetry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_entropy_hash_key" ON "artifacts"("entropy_hash");
