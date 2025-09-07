"use client"

import { useState, useCallback } from "react"
import { generatePresignedUrl } from "../actions/generate-presigned-url"
import { finalizeUpload } from "../actions/process-upload"
import { toastify } from "@/features/toast/index.client"
import { ApiResponse } from "@/features/secureApi"

interface UseDirectUploadOptions {
   onSuccess?: (episodeId: string, uploadUrl: string) => void
   onError?: (error: string) => void
}

export function useDirectUpload(options?: UseDirectUploadOptions) {
   const [isUploading, setIsUploading] = useState(false)
   const [progress, setProgress] = useState(0)
   const [currentEpisode, setCurrentEpisode] = useState<{ id: string; url: string } | null>(null)

   const upload = useCallback(
      async (title: string, description: string | undefined, file: File) => {
         if (isUploading) return

         setIsUploading(true)
         setProgress(0)
         setCurrentEpisode(null)

         try {
            // Step 1: Get a presigned URL for direct upload
            const presignedUrlResult = (await generatePresignedUrl({ filename: file.name, contentType: file.type })) as ApiResponse<{
               episodeId: string
               presignedUrl: string
               objectKey: string
               bucket: string
            }>

            if (!presignedUrlResult.success || !presignedUrlResult.data) {
               toastify(presignedUrlResult)
               options?.onError?.(presignedUrlResult.toastDescription || "Failed to generate upload URL")
               setIsUploading(false)
               return
            }

            const { episodeId, presignedUrl, objectKey } = presignedUrlResult.data

            // Step 2: Upload directly to MinIO using the presigned URL
            setProgress(10)

            // Create a fetch request to upload the file directly to MinIO
            const uploadResponse = await fetch(presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })

            if (!uploadResponse.ok) {
               const errorText = await uploadResponse.text()
               throw new Error(`Upload failed: ${errorText}`)
            }

            setProgress(70)

            // Step 3: Create episode record and trigger processing
            const createEpisodeResult = (await finalizeUpload({
               episodeId,
               title,
               description,
               fileName: file.name,
               fileSize: file.size,
               objectKey,
               contentType: file.type,
            })) as ApiResponse<{ episodeId: string; uploadUrl: string }>

            setProgress(100)

            if (createEpisodeResult.success && createEpisodeResult.data) {
               setCurrentEpisode({ id: createEpisodeResult.data.episodeId, url: createEpisodeResult.data.uploadUrl })
               options?.onSuccess?.(createEpisodeResult.data.episodeId, createEpisodeResult.data.uploadUrl)
            } else {
               options?.onError?.(createEpisodeResult.toastDescription || "Failed to process upload")
            }

            toastify(createEpisodeResult)
         } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            options?.onError?.(errorMessage)
            toastify({ toastTitle: "Upload Error", toastDescription: errorMessage, toastType: "error" })
         } finally {
            setIsUploading(false)
         }
      },
      [isUploading, options],
   )

   const reset = useCallback(() => {
      setIsUploading(false)
      setProgress(0)
      setCurrentEpisode(null)
   }, [])

   return { upload, reset, isUploading, progress, currentEpisode }
}
