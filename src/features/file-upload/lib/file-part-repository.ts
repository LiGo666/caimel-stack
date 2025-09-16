import { PrismaClient } from "@/repository/prisma";
import {
  type CreateFilePartData,
  type FilePart,
  PartStatus,
} from "../types/database";

// Initialize Prisma client
const prisma = new PrismaClient();

export class FilePartRepository {
  /**
   * Create a new file part
   */
  async create(data: CreateFilePartData): Promise<FilePart> {
    return await prisma.filePart.create({
      data,
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Find file part by ID
   */
  async findById(id: string): Promise<FilePart | null> {
    return await prisma.filePart.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Find parts by session ID
   */
  async findBySessionId(sessionId: string): Promise<FilePart[]> {
    return await prisma.filePart.findMany({
      where: { sessionId },
      orderBy: { partNumber: "asc" },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Find specific part by session and part number
   */
  async findBySessionAndPartNumber(
    sessionId: string,
    partNumber: number
  ): Promise<FilePart | null> {
    return await prisma.filePart.findUnique({
      where: {
        sessionId_partNumber: {
          sessionId,
          partNumber,
        },
      },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Update part status
   */
  async updateStatus(
    id: string,
    status: PartStatus,
    etag?: string,
    uploadedAt?: Date
  ): Promise<FilePart> {
    return await prisma.filePart.update({
      where: { id },
      data: {
        status,
        ...(etag && { etag }),
        ...(uploadedAt && { uploadedAt }),
      },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Update part status by session and part number
   */
  async updateStatusBySessionAndPart(
    sessionId: string,
    partNumber: number,
    status: PartStatus,
    etag?: string,
    uploadedAt?: Date
  ): Promise<FilePart> {
    return await prisma.filePart.update({
      where: {
        sessionId_partNumber: {
          sessionId,
          partNumber,
        },
      },
      data: {
        status,
        ...(etag && { etag }),
        ...(uploadedAt && { uploadedAt }),
      },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
    });
  }

  /**
   * Get parts by status
   */
  async findByStatus(status: PartStatus, limit = 100): Promise<FilePart[]> {
    return await prisma.filePart.findMany({
      where: { status },
      include: {
        session: {
          include: {
            jobs: true,
            parts: true,
            group: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Get completed parts for a session (used for multipart upload completion)
   */
  async getCompletedPartsForSession(sessionId: string): Promise<FilePart[]> {
    return await prisma.filePart.findMany({
      where: {
        sessionId,
        status: PartStatus.UPLOADED,
        etag: { not: null },
      },
      orderBy: { partNumber: "asc" },
    });
  }

  /**
   * Count parts by session and status
   */
  async countBySessionAndStatus(
    sessionId: string,
    status: PartStatus
  ): Promise<number> {
    return await prisma.filePart.count({
      where: { sessionId, status },
    });
  }

  /**
   * Delete part
   */
  async delete(id: string): Promise<void> {
    await prisma.filePart.delete({
      where: { id },
    });
  }

  /**
   * Delete parts by session ID
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await prisma.filePart.deleteMany({
      where: { sessionId },
    });
    return result.count;
  }

  /**
   * Get part statistics for a session
   */
  async getSessionPartStats(sessionId: string) {
    const stats = await prisma.filePart.groupBy({
      by: ["status"],
      where: { sessionId },
      _count: true,
      _sum: { size: true },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = {
          count: stat._count,
          totalSize: stat._sum.size || 0,
        };
        return acc;
      },
      {} as Record<PartStatus, { count: number; totalSize: number }>
    );
  }
}
