-- ============================================================================
-- Down Migration / Rollback script for 20261006124008_add_action_taken_and_version
-- Sprint 4 / Issue #4-2 (Actions Taken Foundation)
--
-- Actions performed:
-- 1. Drops ActionTaken table and all related foreign key constraints and indexes.
-- 2. Drops ActionStatus enum type.
-- 3. Drops version column from Ticket table.
-- ============================================================================

-- Drop ActionTaken table with all cascaded foreign keys and indices
DROP TABLE IF EXISTS "ActionTaken" CASCADE;

-- Drop ActionStatus enum
DROP TYPE IF EXISTS "ActionStatus";

-- Remove OCC version column from Ticket table
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "version";

-- Note on User.passwordHash schema drift:
-- The forward migration included 'ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;'
-- to eliminate insecure default dummy hashes. If rolling back schema drift to Lab 3 state is desired,
-- execute:
-- ALTER TABLE "User" ALTER COLUMN "passwordHash" SET DEFAULT '$2b$10$w1...';
