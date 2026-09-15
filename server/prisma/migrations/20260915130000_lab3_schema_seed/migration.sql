-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "ITPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');

-- 1. Evolve RequesterUser into User
-- Drop existing foreign key from Ticket to RequesterUser
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";

-- Rename table RequesterUser to User
ALTER TABLE "RequesterUser" RENAME TO "User";

-- Rename sequence, primary key constraint, and unique index
ALTER SEQUENCE IF EXISTS "RequesterUser_id_seq" RENAME TO "User_id_seq";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX IF EXISTS "RequesterUser_email_key" RENAME TO "User_email_key";

-- Add new columns to User with valid bcrypt default for 'Password123!'
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$j8OCUeY3x8nEihFxZ18UsebvAosq8mZBg0d4LNpqbiiqRQZASc3Xa';
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Flag David Lee for mandatory first-login password change
UPDATE "User" SET "mustChangePassword" = true WHERE "email" = 'david.lee@example.com';

-- 2. Enhance Ticket
-- Add ownerId column
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;

-- Add itPriority column (initially nullable to populate from requestedPriority)
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "ITPriority";

-- Copy requestedPriority to itPriority for all existing tickets (Handout §4.5 / BR-12)
UPDATE "Ticket" SET "itPriority" = "requestedPriority"::text::"ITPriority" WHERE "itPriority" IS NULL;

-- Enforce NOT NULL on itPriority
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- Migrate currentStatus from CurrentStatus to TicketStatus
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" TYPE TEXT;
UPDATE "Ticket" SET "currentStatus" = 'WAITING_FOR_REQUESTER' WHERE "currentStatus" = 'PENDING';
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" TYPE "TicketStatus" USING ("currentStatus"::"TicketStatus");
ALTER TABLE "Ticket" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW';
DROP TYPE IF EXISTS "CurrentStatus";

-- Add resolution fields
ALTER TABLE "Ticket" ADD COLUMN "resolutionIndicated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ticket" ADD COLUMN "resolutionIndicatedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "resolutionSummary" TEXT;

-- Re-add foreign key from Ticket(requesterId) to User(id)
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key from Ticket(ownerId) to User(id)
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new indexes on Ticket
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "Ticket_currentStatus_idx" ON "Ticket"("currentStatus");
CREATE INDEX "Ticket_itPriority_idx" ON "Ticket"("itPriority");

-- 3. Create PublicComment Table
CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_idx" ON "PublicComment"("ticketId");
CREATE INDEX "PublicComment_authorId_idx" ON "PublicComment"("authorId");

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Create InternalNote Table
CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalNote_ticketId_idx" ON "InternalNote"("ticketId");
CREATE INDEX "InternalNote_authorId_idx" ON "InternalNote"("authorId");

ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
