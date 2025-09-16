import { PrismaClient } from "@/repository/prisma";
import {
  type CreateUploadGroupData,
  GroupStatus,
  type UploadGroup,
} from "../types/database";

// Initialize Prisma client
const prisma = new PrismaClient();

export class UploadGroupRepository {
  /**
   * Create a new upload group
   */
  async create(data: CreateUploadGroupData): Promise<UploadGroup> {
    return await prisma.uploadGroup.create({
      data,
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
    });
  }

  /**
   * Find upload group by ID
   */
  async findById(id: string): Promise<UploadGroup | null> {
    return await prisma.uploadGroup.findUnique({
      where: { id },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
    });
  }

  /**
   * Update upload group status
   */
  async updateStatus(id: string, status: GroupStatus): Promise<UploadGroup> {
    return await prisma.uploadGroup.update({
      where: { id },
      data: { status },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
    });
  }

  /**
   * Update file counters for the group
   */
  async updateCounters(
    id: string,
    totalFiles: number,
    completedFiles: number
  ): Promise<UploadGroup> {
    return await prisma.uploadGroup.update({
      where: { id },
      data: { totalFiles, completedFiles },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
    });
  }

  /**
   * Increment completed files counter
   */
  async incrementCompletedFiles(id: string): Promise<UploadGroup> {
    return await prisma.uploadGroup.update({
      where: { id },
      data: { completedFiles: { increment: 1 } },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
    });
  }

  /**
   * Get user's upload groups
   */
  async findByUserId(userId: string, limit = 50): Promise<UploadGroup[]> {
    return await prisma.uploadGroup.findMany({
      where: { userId },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get groups by status
   */
  async findByStatus(status: GroupStatus, limit = 100): Promise<UploadGroup[]> {
    return await prisma.uploadGroup.findMany({
      where: { status },
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Get all groups (most recent first)
   */
  async findAll(limit = 100): Promise<UploadGroup[]> {
    return await prisma.uploadGroup.findMany({
      include: {
        sessions: {
          include: {
            jobs: true,
            parts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Clean up old completed or failed groups
   */
  async cleanupOldGroups(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.uploadGroup.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoffDate } },
          {
            OR: [
              { status: GroupStatus.COMPLETED },
              { status: GroupStatus.FAILED },
            ],
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Delete upload group and all related sessions
   */
  async delete(id: string): Promise<void> {
    await prisma.uploadGroup.delete({
      where: { id },
    });
  }

  /**
   * Get group statistics
   */
  async getGroupStats() {
    const stats = await prisma.uploadGroup.groupBy({
      by: ["status"],
      _count: true,
      _sum: {
        totalFiles: true,
        completedFiles: true,
      },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = {
          count: stat._count,
          totalFiles: stat._sum.totalFiles || 0,
          completedFiles: stat._sum.completedFiles || 0,
        };
        return acc;
      },
      {} as Record<
        GroupStatus,
        { count: number; totalFiles: number; completedFiles: number }
      >
    );
  }
}
