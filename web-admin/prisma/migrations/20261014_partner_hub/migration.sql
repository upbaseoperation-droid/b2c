CREATE TABLE IF NOT EXISTS "PartnerHubThread" (
  "id" TEXT PRIMARY KEY,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PartnerHubThread_updatedAt_idx" ON "PartnerHubThread"("updatedAt");
