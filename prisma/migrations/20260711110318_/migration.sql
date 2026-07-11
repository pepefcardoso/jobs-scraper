-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "linkedinJobId" TEXT NOT NULL,
    "searchUrl" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "rawHtml" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "listMeta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extraction" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "structuredData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_linkedinJobId_key" ON "Job"("linkedinJobId");

-- CreateIndex
CREATE INDEX "Extraction_status_idx" ON "Extraction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Extraction_jobId_provider_promptVersion_key" ON "Extraction"("jobId", "provider", "promptVersion");

-- AddForeignKey
ALTER TABLE "Extraction" ADD CONSTRAINT "Extraction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
