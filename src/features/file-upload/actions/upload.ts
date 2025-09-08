"use server"

import { MinioClient } from "@/features/minio"
import { createUploadConfig } from "../config/upload-config"
import { 
  FileUploadConfig, 
  FileUploadRequest, 
  FileUploadResponse, 
  MultipartUploadAbortRequest, 
  MultipartUploadAbortResponse, 
  MultipartUploadCompleteRequest, 
  MultipartUploadCompleteResponse, 
  MultipartUploadInitResponse, 
  MultipartUploadRequest 
} from "../types"
import { 
  fileUploadRequestSchema, 
  multipartUploadAbortSchema, 
  multipartUploadCompleteSchema, 
  multipartUploadInitSchema 
} from "../schema/upload.schema"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import path from "path"

/**
 * Generate a presigned URL for file upload
 */
export async function getPresignedUrl(request: FileUploadRequest, customConfig?: Partial<FileUploadConfig>): Promise<FileUploadResponse> {
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

/**
 * Get a download URL for a file
 */
export async function getFileUrl(bucketName: string, objectKey: string, expiryInSeconds = 3600): Promise<string> {
   try {
      const minioClient = new MinioClient()
      return await minioClient.getPresignedObjectUrl(bucketName, objectKey, expiryInSeconds)
   } catch (error) {
      console.error("Error getting file URL:", error)
      throw new Error("Failed to get file URL")
   }
}

/**
 * Delete a file
 */
export async function deleteFile(bucketName: string, objectKey: string, revalidate?: string): Promise<boolean> {
   try {
      const minioClient = new MinioClient()
      const result = await minioClient.removeObject(bucketName, objectKey)

      // Revalidate path if provided
      if (revalidate) {
         revalidatePath(revalidate)
      }

      return result
   } catch (error) {
      console.error("Error deleting file:", error)
      return false
   }
}

/**
 * List files in a bucket
 */
export async function listFiles(bucketName: string, prefix = "", maxKeys = 1000) {
   try {
      const minioClient = new MinioClient()
      return await minioClient.listObjects({ bucketName, prefix, maxKeys })
   } catch (error) {
      console.error("Error listing files:", error)
      return []
   }
}

/**
 * Initialize a multipart upload
 * This creates a multipart upload and returns presigned URLs for each part
 */
export async function initMultipartUpload(request: MultipartUploadRequest, customConfig?: Partial<FileUploadConfig>): Promise<MultipartUploadInitResponse> {
   try {
      // Validate request
      const validatedRequest = multipartUploadInitSchema.parse(request)

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

      // Calculate number of parts based on file size and part size
      const partSize = validatedRequest.partSize || 8 * 1024 * 1024 // Default 8MB chunks
      const partCount = Math.ceil(validatedRequest.fileSize / partSize)

      // Generate a unique file name to avoid collisions
      const fileExtension = path.extname(validatedRequest.fileName)
      const fileName = `${randomUUID()}${fileExtension}`
      const objectName = `${config.uploadFolder}/${fileName}`

      // Initialize MinIO client
      const minioClient = new MinioClient()

      // Initialize multipart upload
      const result = await minioClient.initMultipartUpload({
         bucketName: config.bucketName,
         objectName,
         contentType: validatedRequest.fileType,
         partCount,
         expiry: 3600 // 1 hour expiry for presigned URLs
      })

      return {
         success: true,
         uploadId: result.uploadId,
         key: result.key,
         parts: result.parts
      }
   } catch (error) {
      console.error("Error initializing multipart upload:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
   }
}

/**
 * Complete a multipart upload
 * This finalizes a multipart upload after all parts have been uploaded
 */
export async function completeMultipartUpload(request: MultipartUploadCompleteRequest, customConfig?: Partial<FileUploadConfig>): Promise<MultipartUploadCompleteResponse> {
   try {
      // Validate request
      const validatedRequest = multipartUploadCompleteSchema.parse(request)

      // Create config by merging default with custom config
      const config = createUploadConfig(customConfig)
      const bucketName = validatedRequest.config?.bucketName || config.bucketName

      // Initialize MinIO client
      const minioClient = new MinioClient()

      // Complete multipart upload
      const result = await minioClient.completeMultipartUpload({
         bucketName,
         objectName: validatedRequest.key,
         uploadId: validatedRequest.uploadId,
         parts: validatedRequest.parts
      })

      if (!result) {
         return { success: false, error: "Failed to complete multipart upload" }
      }

      // Generate a URL for the uploaded file
      const url = await minioClient.getPresignedObjectUrl(bucketName, validatedRequest.key, 3600)

      return {
         success: true,
         key: validatedRequest.key,
         url
      }
   } catch (error) {
      console.error("Error completing multipart upload:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
   }
}

/**
 * Abort a multipart upload
 * This cancels a multipart upload and removes any uploaded parts
 */
export async function abortMultipartUpload(request: MultipartUploadAbortRequest, customConfig?: Partial<FileUploadConfig>): Promise<MultipartUploadAbortResponse> {
   try {
      // Validate request
      const validatedRequest = multipartUploadAbortSchema.parse(request)

      // Create config by merging default with custom config
      const config = createUploadConfig(customConfig)
      const bucketName = validatedRequest.config?.bucketName || config.bucketName

      // Initialize MinIO client
      const minioClient = new MinioClient()

      // Abort multipart upload
      const result = await minioClient.abortMultipartUpload(
         bucketName,
         validatedRequest.key,
         validatedRequest.uploadId
      )

      if (!result) {
         return { success: false, error: "Failed to abort multipart upload" }
      }

      return { success: true }
   } catch (error) {
      console.error("Error aborting multipart upload:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
   }
}
