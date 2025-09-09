// Database types for file upload system - using Prisma-generated types

import { FileStatus, JobStatus, JobType, UploadSession as PrismaUploadSession, ProcessingJob as PrismaProcessingJob } from "@/repository/prisma"

// Re-export Prisma enums for consistency
export { FileStatus, JobStatus, JobType }

// Use Prisma-generated types but with jobs included
export type UploadSession = PrismaUploadSession & { jobs?: ProcessingJob[] }

export type ProcessingJob = PrismaProcessingJob

export interface CreateUploadSessionData {
   userId?: string
   objectKey: string
   uploadId?: string
}

export interface CreateJobData {
   sessionId: string
   type: JobType
   priority?: number
   config?: Record<string, any>
   maxAttempts?: number
}

// Helper to parse file info from MinIO objectKey
export function parseObjectKey(objectKey: string) {
   const parts = objectKey.split("/")
   const fileName = parts[parts.length - 1]
   const folder = parts.slice(0, -1).join("/")
   const extension = fileName.split(".").pop()?.toLowerCase()

   return { fileName, folder, extension, fullPath: objectKey }
}
