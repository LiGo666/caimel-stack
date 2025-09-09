-- CreateEnum
CREATE TYPE "public"."FileStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('TRANSCRIPTION', 'THUMBNAIL_GENERATION', 'VIRUS_SCAN', 'CONTENT_ANALYSIS', 'COMPRESSION');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."upload_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "objectKey" TEXT NOT NULL,
    "uploadId" TEXT,
    "status" "public"."FileStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processing_jobs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "config" JSONB,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Path" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "passphrases" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Path_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_objectKey_key" ON "public"."upload_sessions"("objectKey");

-- CreateIndex
CREATE INDEX "processing_jobs_status_priority_createdAt_idx" ON "public"."processing_jobs"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "processing_jobs_type_status_idx" ON "public"."processing_jobs"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Path_path_key" ON "public"."Path"("path");

-- AddForeignKey
ALTER TABLE "public"."upload_sessions" ADD CONSTRAINT "upload_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processing_jobs" ADD CONSTRAINT "processing_jobs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
