import { z } from 'zod'

// File upload types and schemas
export const UploadEpisodeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  file: z.custom<File>((file) => file instanceof File, 'File is required')
    .refine((file) => file.size <= 500 * 1024 * 1024, 'File must be less than 500MB')
    .refine(
      (file) => ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'].includes(file.type),
      'Only MP3 and WAV files are supported'
    ),
})

export type UploadEpisodeInput = z.infer<typeof UploadEpisodeSchema>

export interface UploadProgress {
  episodeId: string
  progress: number
  stage: 'uploading' | 'processing' | 'completed' | 'error'
  message?: string
}

export interface AudioMetadata {
  duration: number
  sampleRate: number
  channels: number
  format: string
  bitrate?: number
}

export interface MinioUploadResult {
  key: string
  bucket: string
  etag: string
  location: string
}
