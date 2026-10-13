CREATE TABLE "ContractHubRecord" (
  "id" TEXT PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ContractHubRecord_updatedAt_idx" ON "ContractHubRecord" ("updatedAt");
