"use server"

import { auth } from "@clerk/nextjs/server"
import { getTranslations } from "next-intl/server"
import { ApiResponse, assertRatelimit } from "@/features/secureApi"
import { minioService } from "../lib/minio-client"
import { UploadHandler } from "../lib/upload-handler"
import { PresignedUrlInput, PresignedUrlSchema } from "../schemas/upload-schemas"

export async function generatePresignedUrl({ filename, contentType }: PresignedUrlInput): Promise<ApiResponse> {
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
    const validation = PresignedUrlSchema.safeParse({ filename, contentType })
    if (!validation.success) {
      return {
        success: false,
        toastTitle: t("error.validation.title"),
        toastDescription: validation.error.issues[0]?.message || t("error.validation.description"),
        toastType: "error",
      }
    }

    // Validate content type
    const supportedFormats = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
    if (!supportedFormats.includes(contentType)) {
      return {
        success: false,
        toastTitle: t("error.validation.title"),
        toastDescription: "Unsupported file format. Please upload MP3 or WAV files.",
        toastType: "error",
      }
    }

    // Generate episode ID and object key
    const episodeId = UploadHandler.generateEpisodeId()
    const fileExtension = filename.split('.').pop() || 'mp3'
    const objectName = `uploads/${episodeId}/source.${fileExtension}`
    
    // Generate presigned PUT URL for direct upload
    const presignedUrl = await minioService.generatePresignedPutUrl(
      'voice-episodes',
      objectName,
      contentType,
      3600 // 1 hour expiry
    )

    return {
      success: true,
      data: {
        episodeId,
        presignedUrl,
        objectKey: objectName,
        bucket: 'voice-episodes',
      },
      toastTitle: t("success.urlGenerated.title"),
      toastDescription: t("success.urlGenerated.description"),
      toastType: "success",
    }
  } catch (error) {
    console.error("Generate presigned URL error:", error)
    return {
      success: false,
      errorCode: "UNEXPECTED_ERROR",
      toastType: "error",
      toastTitle: tGeneric("error.unexpected.title"),
      toastDescription: tGeneric("error.unexpected.description"),
      timestamp: new Date().toISOString(),
    }
  }
}
