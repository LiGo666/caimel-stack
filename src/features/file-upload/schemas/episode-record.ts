import { z } from "zod"

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
