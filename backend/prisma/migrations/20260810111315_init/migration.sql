-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('NEW_REQUEST', 'IN_REVIEW', 'PENDING_DOCUMENTS', 'APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('EDUCATION', 'DUAL');

-- CreateEnum
CREATE TYPE "DocumentKey" AS ENUM ('REG', 'ASIC', 'ID', 'PIER', 'MARN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('MISSING', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReferenceOutcome" AS ENUM ('PENDING', 'PASSED');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('A', 'B', 'C', 'UNRATED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'REVIEWER', 'AUDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REVIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" "AgentType" NOT NULL DEFAULT 'EDUCATION',
    "abn" TEXT,
    "acn" TEXT,
    "marn" TEXT,
    "onshore" BOOLEAN NOT NULL DEFAULT false,
    "status" "AgentStatus" NOT NULL DEFAULT 'NEW_REQUEST',
    "rating" "Rating" NOT NULL DEFAULT 'UNRATED',
    "certExpiry" TIMESTAMP(3),
    "stage" INTEGER NOT NULL DEFAULT 1,
    "ackSent" BOOLEAN NOT NULL DEFAULT false,
    "ackReplied" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "key" "DocumentKey" NOT NULL,
    "fileName" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'MISSING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "refereeName" TEXT NOT NULL,
    "cricosProvider" TEXT NOT NULL,
    "outcome" "ReferenceOutcome" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "intake" TEXT NOT NULL,
    "enrolments" INTEGER NOT NULL DEFAULT 0,
    "conversion" INTEGER NOT NULL DEFAULT 0,
    "visaRefusal" INTEGER NOT NULL DEFAULT 0,
    "withdrawals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "agentId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_appId_key" ON "Agent"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_agentId_key_key" ON "Document"("agentId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTask_agentId_key_key" ON "OnboardingTask"("agentId", "key");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
