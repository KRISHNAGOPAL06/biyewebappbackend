-- 1) Add the column as nullable (do NOT make NOT NULL or DEFAULT yet)
ALTER TABLE "profiles" ADD COLUMN "registeredUserId" TEXT;

-- 2) Backfill values using a CTE so the window function is computed in a SELECT (valid in Postgres)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (ORDER BY "createdAt") AS rn
  FROM "profiles"
  WHERE COALESCE("registeredUserId", '') = ''
)
UPDATE "profiles" p
SET "registeredUserId" = 'TBCo_' || LPAD(r.rn::text, 9, '0')
FROM ranked r
WHERE p.id = r.id;

-- 3) (Optional) Verify no empty/NULL values remain:
-- SELECT COUNT(*) FROM "profiles" WHERE COALESCE("registeredUserId", '') = '';

-- 4) Create the unique index for registeredUserId
CREATE UNIQUE INDEX "profiles_registeredUserId_key" ON "profiles"("registeredUserId");

-- 5) Make the column NOT NULL (and optionally set a DEFAULT if you really want one)
ALTER TABLE "profiles" ALTER COLUMN "registeredUserId" SET NOT NULL;

-- 6) If you need a default for future inserts, set it now:
-- (Note: setting default to '' would violate uniqueness for multiple rows,
--  so choose a safe default or omit it. Example below sets no default.)
-- ALTER TABLE "profiles" ALTER COLUMN "registeredUserId" SET DEFAULT '';

