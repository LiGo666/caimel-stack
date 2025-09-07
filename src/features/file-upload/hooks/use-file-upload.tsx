"use client"

import { useState, useCallback } from "react"
import { uploadEpisode } from "../actions/upload-episode"
import { toastify } from "@/features/toast"
import { ApiResponse } from "@/features/secureApi"

interface UseFileUploadOptions {
   onSuccess?: (episodeId: string, uploadUrl: string) => void
   onError?: (error: string) => void
}

export function useFileUpload(options?: UseFileUploadOptions) {
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
            const formData = new FormData()
            formData.append("title", title)
            if (description) {
               formData.append("description", description)
            }
            formData.append("file", file)

            // Simulate upload progress
            const progressInterval = setInterval(() => {
               setProgress((prev) => Math.min(prev + 10, 90))
            }, 200)

            const result = await uploadEpisode(formData) as ApiResponse<{ episodeId: string; uploadUrl: string }>
            clearInterval(progressInterval)
            setProgress(100)

            if (result.success && result.data) {
               setCurrentEpisode({ id: result.data.episodeId, url: result.data.uploadUrl })
               options?.onSuccess?.(result.data.episodeId, result.data.uploadUrl)
            } else {
               options?.onError?.(result.toastDescription || "Upload failed")
            }

            toastify(result)
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
