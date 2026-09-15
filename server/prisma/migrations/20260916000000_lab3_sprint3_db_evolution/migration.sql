-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum CurrentStatus
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "CurrentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateTable: User
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '$2a$10$wE8wJ7L2Qn6LqE2e6f4O2u1Z1d4K3j8L5M6N7O8P9Q0R1S2T3U4V5',
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Migrate existing RequesterUser records to User
INSERT INTO "User" ("id", "name", "email", "isActive", "createdAt", "role", "requiresPasswordChange")
SELECT "id", "name", "email", "isActive", "createdAt", 'REQUESTER'::"Role", true
FROM "RequesterUser"
ON CONFLICT ("email") DO NOTHING;

-- Drop ForeignKey from Ticket to RequesterUser
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";

-- Drop RequesterUser Table
DROP TABLE IF EXISTS "RequesterUser";

-- AlterTable Ticket: add ownerId, indicator timestamps, and convert priority types to Priority enum
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "requesterResolvedIndicatedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "requesterReopenRequestedAt" TIMESTAMP(3);

ALTER TABLE "Ticket" ALTER COLUMN "requestedPriority" TYPE "Priority" USING "requestedPriority"::text::"Priority";
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" TYPE "Priority" USING "itPriority"::text::"Priority";

-- AddForeignKey Ticket to User (Requester)
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey Ticket to User (Owner)
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for ownerId
CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");

-- CreateTable: PublicComment
CREATE TABLE "PublicComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicComment_ticketId_createdAt_idx" ON "PublicComment"("ticketId", "createdAt" ASC);

-- AddForeignKey PublicComment
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: InternalNote
CREATE TABLE "InternalNote" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt" ASC);

-- AddForeignKey InternalNote
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
