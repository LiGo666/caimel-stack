import { MinioClient } from "@/features/minio"
import { createUploadConfig } from "../config/upload-config"
import { FileUploadConfig, FileUploadRequest, FileUploadResponse, FileType } from "../types"
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

      // Validate bucket name follows S3 naming rules
      const bucketNameRegex = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
      if (!bucketNameRegex.test(config.bucketName)) {
         return {
            success: false,
            error: `Invalid bucket name: ${config.bucketName}. Bucket names must be 3-63 characters, lowercase letters, numbers, dots, or hyphens, and must begin and end with a letter or number.`,
         }
      }

      // Validate file type
      const fileTypeValue = validatedRequest.fileType as FileType
      if (!config.allowedFileTypes.includes(fileTypeValue)) {
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

      // Ensure bucket exists
      const bucketExists = await minioClient.bucketExists(config.bucketName)
      if (!bucketExists) {
         console.log(`Bucket ${config.bucketName} does not exist, creating it...`)
         await minioClient.createBucket({ name: config.bucketName })
         console.log(`Bucket ${config.bucketName} created successfully`)
      }

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
