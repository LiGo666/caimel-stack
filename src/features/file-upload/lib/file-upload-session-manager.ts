import { PrismaClient } from "@/repository/prisma";
import {
  CreateFilePartData,
  type CreateJobData,
  type CreateUploadSessionData,
  FilePart,
  FileStatus,
  JobStatus,
  type JobType,
  PartStatus,
  type ProcessingJob,
  type UploadSession,
} from "../types/database";

// Initialize Prisma client
const prisma = new PrismaClient();

export class UploadSessionRepository {
  /**
   * Create a new upload session with minimal data
   */
  async create(data: CreateUploadSessionData): Promise<UploadSession> {
    return await prisma.uploadSession.create({
      data,
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Find upload session by object key (for webhook updates)
   */
  async findByObjectKey(objectKey: string): Promise<UploadSession | null> {
    return await prisma.uploadSession.findUnique({
      where: { objectKey },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Find upload session by ID
   */
  async findById(id: string): Promise<UploadSession | null> {
    return await prisma.uploadSession.findUnique({
      where: { id },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Update upload session status
   */
  async updateStatus(
    id: string,
    status: FileStatus,
    uploadedAt?: Date
  ): Promise<UploadSession> {
    return await prisma.uploadSession.update({
      where: { id },
      data: { status, ...(uploadedAt && { uploadedAt }) },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Update upload session status by object key (for webhooks)
   */
  async updateStatusByObjectKey(
    objectKey: string,
    status: FileStatus,
    uploadedAt?: Date
  ): Promise<UploadSession> {
    return await prisma.uploadSession.update({
      where: { objectKey },
      data: { status, ...(uploadedAt && { uploadedAt }) },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Add processing job to upload session
   */
  async addJob(data: CreateJobData): Promise<ProcessingJob> {
    return await prisma.processingJob.create({
      data: {
        sessionId: data.sessionId,
        type: data.type,
        priority: data.priority || 5,
        config: data.config,
        maxAttempts: data.maxAttempts || 3,
      },
    });
  }

  /**
   * Get user's upload sessions
   */
  async findByUserId(userId: string, limit = 50): Promise<UploadSession[]> {
    return await prisma.uploadSession.findMany({
      where: { userId },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get sessions by status
   */
  async findByStatus(
    status: FileStatus,
    limit = 100
  ): Promise<UploadSession[]> {
    return await prisma.uploadSession.findMany({
      where: { status },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Get all sessions (most recent first)
   */
  async findAll(limit = 100): Promise<UploadSession[]> {
    return await prisma.uploadSession.findMany({
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Clean up old failed or completed sessions
   */
  async cleanupOldSessions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.uploadSession.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoffDate } },
          {
            OR: [
              { status: FileStatus.FAILED },
              { status: FileStatus.COMPLETED },
              { status: FileStatus.DELETED },
            ],
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Update multipart upload tracking
   */
  async updateMultipartTracking(
    id: string,
    totalParts: number,
    uploadId?: string
  ): Promise<UploadSession> {
    return await prisma.uploadSession.update({
      where: { id },
      data: {
        totalParts,
        completedParts: 0,
        ...(uploadId && { uploadId }),
      },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Increment completed parts counter
   */
  async incrementCompletedParts(id: string): Promise<UploadSession> {
    return await prisma.uploadSession.update({
      where: { id },
      data: { completedParts: { increment: 1 } },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
    });
  }

  /**
   * Find sessions by group ID
   */
  async findByGroupId(groupId: string): Promise<UploadSession[]> {
    return await prisma.uploadSession.findMany({
      where: { groupId },
      include: {
        jobs: true,
        parts: true,
        group: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

export class ProcessingJobRepository {
  /**
   * Get next pending jobs to process
   */
  async getNextJobs(limit = 10): Promise<ProcessingJob[]> {
    return await prisma.processingJob.findMany({
      where: {
        status: JobStatus.PENDING,
        attempts: { lt: 3 }, // Use maxAttempts value directly since we can't access schema fields at runtime
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: limit,
    });
  }

  /**
   * Mark job as running
   */
  async markAsRunning(jobId: string): Promise<ProcessingJob> {
    return await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Mark job as completed with results
   */
  async markAsCompleted(
    jobId: string,
    result?: Record<string, any>
  ): Promise<ProcessingJob> {
    return await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, completedAt: new Date(), result },
    });
  }

  /**
   * Mark job as failed
   */
  async markAsFailed(jobId: string, error: string): Promise<ProcessingJob> {
    return await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: JobStatus.FAILED, completedAt: new Date(), error },
    });
  }

  /**
   * Get jobs by type and status
   */
  async findByTypeAndStatus(
    type: JobType,
    status: JobStatus
  ): Promise<ProcessingJob[]> {
    return await prisma.processingJob.findMany({
      where: { type, status },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get job statistics
   */
  async getStats() {
    const stats = await prisma.processingJob.groupBy({
      by: ["status", "type"],
      _count: true,
    });

    return stats.reduce(
      (acc, stat) => {
        if (!acc[stat.type]) acc[stat.type] = {};
        acc[stat.type][stat.status] = stat._count;
        return acc;
      },
      {} as Record<JobType, Partial<Record<JobStatus, number>>>
    );
  }
}
