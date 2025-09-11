import { MinioClient } from "@/features/minio"
import { createFileUploadConfig } from "../config/file-upload-config"
import { FileUploadConfig, FileUploadRequest, FileUploadResponse, FileType } from "../types"
import { fileUploadRequestSchema } from "../schema/upload.schema"
import { randomUUID } from "crypto"
import path from "path"
import { MINIO_NOTIFY_WEBHOOK_ENDPOINT, MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS } from "@/features/env"
import { UploadSessionRepository } from "./file-upload-session-manager"
import { FileStatus } from "../types/database"

/**
 * Server-only function to generate a presigned URL for file upload
 * This function handles all the validation and security checks
 */
export async function generateFileUploadUrl(request: FileUploadRequest, customConfig?: Partial<FileUploadConfig>): Promise<FileUploadResponse> {
   try {
      // Validate request
      const validatedRequest = fileUploadRequestSchema.parse(request)

      // Create config by merging default with custom config
      const config = createFileUploadConfig(customConfig)

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

      // Check if bucket exists
      const bucketExists = await minioClient.bucketExists(config.bucketName)

      // If bucket doesn't exist, create it and set up notifications
      if (!bucketExists) {
         try {
            console.log(`Bucket ${config.bucketName} does not exist, creating it...`)
            await minioClient.createBucket({ name: config.bucketName })
            console.log(`Bucket ${config.bucketName} created successfully`)

            // Set up notifications for the new bucket
            await setupBucketNotifications(minioClient, config)
         } catch (error) {
            console.error(`Error creating bucket ${config.bucketName}:`, error)
            return { success: false, error: `Error creating bucket ${config.bucketName}: ${error}` }
         }
      } else {
         // Bucket exists, check if notifications are set up
         try {
            const notificationsExist = await minioClient.bucketNotificationExists(config.bucketName)

            if (!notificationsExist) {
               console.log(`Bucket ${config.bucketName} exists but has no notifications, setting them up...`)
               await setupBucketNotifications(minioClient, config)
            } else {
               console.log(`Bucket ${config.bucketName} exists and has notifications set up`)
            }
         } catch (error) {
            console.error(`Error checking bucket notifications for ${config.bucketName}:`, error)
            // Continue even if notification check fails
         }
      }

      // Helper function to set up bucket notifications
      async function setupBucketNotifications(client: MinioClient, cfg: FileUploadConfig) {
         try {
            await client.setBucketNotification({
               bucketName: cfg.bucketName,
               endpoint: MINIO_NOTIFY_WEBHOOK_ENDPOINT,
               events: ["s3:ObjectCreated:*"],
               prefix: cfg.uploadFolder,
               authToken: MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS,
            })
            console.log(`Webhook notification for bucket ${cfg.bucketName} set up successfully`)
         } catch (error) {
            console.error(`Error setting up webhook notification for bucket ${cfg.bucketName}:`, error)
            throw error
         }
      }
      // Initialize the upload session repository
      const uploadSessionRepo = new UploadSessionRepository()
      
      // Create an entry in the database to track this upload
      const uploadSession = await uploadSessionRepo.create({
         objectKey: objectName,
         userId: config.userId, // This will be undefined if not provided in customConfig
      })
      
      console.log(`Created upload session in database with ID: ${uploadSession.id} for object: ${objectName}`)
      
      // Generate presigned URL
      const presignedUrl = await minioClient.generatePresignedUrl({
         bucketName: config.bucketName,
         objectName,
         contentType: validatedRequest.fileType,
         maxSizeBytes: config.maxFileSize, // Pass the maxFileSize from config
      })

      return { 
         success: true, 
         presignedUrl,
         sessionId: uploadSession.id // Return the session ID so client can track it
      }
   } catch (error) {
      console.error("Error generating presigned URL:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
   }
}
