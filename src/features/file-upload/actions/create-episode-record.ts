"use server"

import { z } from "zod"
import { auth } from "@clerk/nextjs/server"
import { getTranslations } from "next-intl/server"
import { ApiResponse, assertRatelimit } from "@/features/secureApi"
import { minioService } from "../lib/minio-client"
import { prisma } from "@/repository/prisma"
import { jobQueue } from "@/features/job-queue"

// Schema for creating episode record after direct upload
export const CreateEpisodeRecordSchema = z.object({
  episodeId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  fileName: z.string(),
  fileSize: z.number().positive(),
  objectKey: z.string(),
  contentType: z.string(),
})

export type CreateEpisodeRecordInput = z.infer<typeof CreateEpisodeRecordSchema>

export async function createEpisodeRecord(params: CreateEpisodeRecordInput): Promise<ApiResponse> {
  const t = await getTranslations("app.episodes.upload.action")
  const tGeneric = await getTranslations("generic")

  try {
    // Security check
    const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS")
    if (!rateLimitResult.success) return rateLimitResult

    // Get current user
    const session = await auth()
    const userId = session.userId
    if (!userId) {
      return {
        success: false,
        toastTitle: t("error.unauthorized.title"),
        toastDescription: t("error.unauthorized.description"),
        toastType: "error",
      }
    }

    // Validate input
    const validation = CreateEpisodeRecordSchema.safeParse(params)
    if (!validation.success) {
      return {
        success: false,
        toastTitle: t("error.validation.title"),
        toastDescription: validation.error.issues[0]?.message || t("error.validation.description"),
        toastType: "error",
      }
    }

    // Extract basic audio metadata
    const audioMetadata = {
      duration: 0, // Will be updated later during processing
      sampleRate: 44100, // Default
      channels: 2, // Default
      format: params.contentType,
    }

    // Create episode record
    const episode = await prisma.episode.create({
      data: {
        id: params.episodeId,
        title: params.title,
        description: params.description,
        originalFilename: params.fileName,
        duration: audioMetadata.duration,
        sampleRate: audioMetadata.sampleRate,
        channels: audioMetadata.channels,
        format: audioMetadata.format,
        fileSize: BigInt(params.fileSize),
        s3Key: params.objectKey,
        uploadedBy: userId,
        status: "UPLOADED",
        processingStage: "PENDING",
      },
    })

    // Queue processing jobs
    await jobQueue.enqueueJob({
      type: "TRANSCRIPTION",
      episodeId: params.episodeId,
      priority: "NORMAL",
      inputData: { episodeId: params.episodeId, s3Key: params.objectKey, audioMetadata },
    })

    // Generate signed URL for immediate access
    const signedUrl = await minioService.getSignedUrl("voice-episodes", params.objectKey, 3600)

    return {
      success: true,
      data: { episodeId: episode.id, uploadUrl: signedUrl },
      toastTitle: t("success.title"),
      toastDescription: t("success.description", { title: episode.title }),
      toastType: "success",
    }
  } catch (error) {
    console.error("Create episode record error:", error)
    return {
      success: false,
      errorCode: "DATABASE_ERROR",
      toastType: "error",
      toastTitle: tGeneric("error.unexpected.title"),
      toastDescription: error instanceof Error ? error.message : tGeneric("error.unexpected.description"),
      timestamp: new Date().toISOString(),
    }
  }
}
