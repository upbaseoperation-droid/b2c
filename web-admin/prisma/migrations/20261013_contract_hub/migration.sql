CREATE TABLE "ContractHubRecord" (
  "id" TEXT PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ContractHubRecord_updatedAt_idx" ON "ContractHubRecord" ("updatedAt");
CREATE TABLE "ContractWeSignBinding" (
  "documentId" TEXT PRIMARY KEY,
  "contractId" TEXT NOT NULL
);
CREATE TABLE "ContractTemplateSnapshot" (
  "hash" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "file" BYTEA NOT NULL
);
