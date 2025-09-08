"use server"

import { MinioClient } from "@/features/minio"
import { createUploadConfig } from "../config/upload-config"
import { 
  FileUploadConfig, 
  FileUploadRequest, 
  FileUploadResponse
} from "../types"
import { fileUploadRequestSchema } from "../schema/upload.schema"
import { randomUUID } from "crypto"
import path from "path"

/**
 * Server-only function to generate a presigned URL for file upload
 * This function handles all the validation and security checks
 */
export async function generatePresignedUrl(request: FileUploadRequest, customConfig?: Partial<FileUploadConfig>): Promise<FileUploadResponse> {
   try {
      // Validate request
      const validatedRequest = fileUploadRequestSchema.parse(request)

      // Create config by merging default with custom config
      const config = createUploadConfig(customConfig)

      // Validate file type
      if (!config.allowedFileTypes.includes(validatedRequest.fileType)) {
         return { success: false, error: `File type not allowed. Allowed types: ${config.allowedFileTypes.join(", ")}` }
      }

      // Validate file size
      if (validatedRequest.fileSize > config.maxFileSize) {
         return { success: false, error: `File size exceeds the maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB` }
      }

      // Generate a unique file name to avoid collisions
      const fileExtension = path.extname(validatedRequest.fileName)
      const fileName = `${randomUUID()}${fileExtension}`
      const objectName = `${config.uploadFolder}/${fileName}`

      // Initialize MinIO client
      const minioClient = new MinioClient()

      // Generate presigned URL
      const presignedUrl = await minioClient.generatePresignedUrl({
         bucketName: config.bucketName,
         objectName,
         contentType: validatedRequest.fileType,
      })

      return { success: true, presignedUrl }
   } catch (error) {
      console.error("Error generating presigned URL:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
   }
}
