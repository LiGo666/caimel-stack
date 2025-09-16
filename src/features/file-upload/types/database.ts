// Database types for file upload system - using Prisma-generated types

import {
  FileStatus,
  GroupStatus,
  JobStatus,
  JobType,
  PartStatus,
  type FilePart as PrismaFilePart,
  type ProcessingJob as PrismaProcessingJob,
  type UploadGroup as PrismaUploadGroup,
  type UploadSession as PrismaUploadSession,
} from "@/repository/prisma";

// Re-export Prisma enums for consistency
export { FileStatus, JobStatus, JobType, GroupStatus, PartStatus };

// Use Prisma-generated types with enhanced relationships
export type UploadGroup = PrismaUploadGroup & {
  sessions?: UploadSession[];
};

export type UploadSession = PrismaUploadSession & {
  jobs?: ProcessingJob[];
  parts?: FilePart[];
  group?: UploadGroup;
};

export type ProcessingJob = PrismaProcessingJob;

export type FilePart = PrismaFilePart;

export interface CreateUploadGroupData {
  name: string;
  description?: string;
  userId?: string;
}

export interface CreateUploadSessionData {
  userId?: string;
  groupId?: string;
  objectKey: string;
  uploadId?: string;
}

export interface CreateJobData {
  sessionId: string;
  type: JobType;
  priority?: number;
  config?: Record<string, any>;
  maxAttempts?: number;
}

export interface CreateFilePartData {
  sessionId: string;
  partNumber: number;
  size: number;
}

// Helper to parse file info from MinIO objectKey
export function parseObjectKey(objectKey: string) {
  const parts = objectKey.split("/");
  const fileName = parts[parts.length - 1];
  const folder = parts.slice(0, -1).join("/");
  const extension = fileName.split(".").pop()?.toLowerCase();

  return { fileName, folder, extension, fullPath: objectKey };
}
