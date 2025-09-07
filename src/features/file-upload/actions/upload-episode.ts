"use server"

import { getTranslations } from "next-intl/server"
import { ApiResponse } from "@/features/secureApi"
import { assertRatelimit } from "@/features/secureApi"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"
import { prisma } from "@/repository/prisma"
import { minioService } from "../lib/minio-client"
import { jobQueue } from "@/features/job-queue"
import { auth } from "@clerk/nextjs/server"
import { UploadHandler } from "../lib/upload-handler"
import { UploadEpisodeSchema } from "../schemas/upload-schemas"

export async function uploadEpisode(formData: FormData): Promise<ApiResponse> {
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

      // Validate form data
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const file = formData.get("file") as File

      if (!file || !(file instanceof File)) {
         return { success: false, toastTitle: t("error.noFile.title"), toastDescription: t("error.noFile.description"), toastType: "error" }
      }

      const validation = UploadEpisodeSchema.safeParse({ title, description })
      if (!validation.success) {
         return {
            success: false,
            toastTitle: t("error.validation.title"),
            toastDescription: validation.error.issues[0]?.message || t("error.validation.description"),
            toastType: "error",
         }
      }

      // Validate file
      await UploadHandler.validateFile(file)

      // Generate episode ID and extract metadata
      const episodeId = UploadHandler.generateEpisodeId()
      const audioMetadata = await UploadHandler.extractAudioMetadata(file)

      // Upload to MinIO
      const uploadResult = await UploadHandler.uploadToMinio(episodeId, file, file.name)

      // Create episode record
      const episode = await prisma.episode.create({
         data: {
            id: episodeId,
            title: validation.data.title,
            description: validation.data.description,
            originalFilename: file.name,
            duration: audioMetadata.duration,
            sampleRate: audioMetadata.sampleRate,
            channels: audioMetadata.channels,
            format: audioMetadata.format,
            fileSize: BigInt(file.size),
            s3Key: uploadResult.key,
            uploadedBy: userId,
            status: "UPLOADED",
            processingStage: "PENDING",
         },
      })

      // Queue processing jobs
      await jobQueue.enqueueJob({
         type: "TRANSCRIPTION",
         episodeId,
         priority: "NORMAL",
         inputData: { episodeId, s3Key: uploadResult.key, audioMetadata },
      })

      // Generate signed URL for immediate access
      const signedUrl = await minioService.getSignedUrl("voice-episodes", uploadResult.key, 3600)

      return {
         success: true,
         data: { episodeId: episode.id, uploadUrl: signedUrl },
         toastTitle: t("success.title"),
         toastDescription: t("success.description", { title: episode.title }),
         toastType: "success",
      }
   } catch (error) {
      console.error("Upload episode error:", error)
      return unexpectedErrorToastContent(tGeneric, "ERROR-123477")
   }
}
