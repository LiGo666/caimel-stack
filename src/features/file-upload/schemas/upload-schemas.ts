import { z } from "zod"

// Schema for presigned URL generation
export const PresignedUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
})

export type PresignedUrlInput = z.infer<typeof PresignedUrlSchema>

// Schema for finalizing an upload after direct upload to MinIO
export const FinalizeUploadSchema = z.object({
  episodeId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  fileName: z.string(),
  fileSize: z.number().positive(),
  objectKey: z.string(),
  contentType: z.string(),
})

export type FinalizeUploadInput = z.infer<typeof FinalizeUploadSchema>

// Schema for regular file upload through form data
export const UploadEpisodeSchema = z.object({ 
  title: z.string().min(1).max(200), 
  description: z.string().optional() 
})
