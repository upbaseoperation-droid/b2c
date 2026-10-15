CREATE TABLE IF NOT EXISTS "AppSharedRecord" (
  "key" TEXT PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "data" JSONB NOT NULL
);
ALTER TABLE "AppSharedRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AppSharedRecord" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "AppSharedRecord" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "AppSharedRecord" FROM authenticated;
  END IF;
END $$;
