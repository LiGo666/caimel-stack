import { NextRequest, NextResponse } from "next/server"
import { MinioWebhookPayload, FileUploadNotification } from "@/features/file-upload/types"
import { MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS } from "@/features/env"
import { z } from "zod"

// Webhook validation schema
const webhookPayloadSchema = z.object({
   EventName: z.string(),
   Key: z.string(),
   Records: z.array(
      z.object({
         eventVersion: z.string(),
         eventSource: z.string(),
         awsRegion: z.string(),
         eventTime: z.string(),
         eventName: z.string(),
         userIdentity: z.object({ principalId: z.string() }),
         requestParameters: z.object({ sourceIPAddress: z.string() }),
         responseElements: z.object({ "x-amz-request-id": z.string(), "x-minio-origin-endpoint": z.string() }),
         s3: z.object({
            s3SchemaVersion: z.string(),
            configurationId: z.string(),
            bucket: z.object({ name: z.string(), ownerIdentity: z.object({ principalId: z.string() }), arn: z.string() }),
            object: z.object({
               key: z.string(),
               size: z.number(),
               eTag: z.string(),
               contentType: z.string(),
               userMetadata: z.record(z.string(), z.string()).optional().default({}),
               sequencer: z.string(),
            }),
         }),
      }),
   ),
})

/**
 * Validate auth token from MinIO webhook
 */
function validateAuthToken(request: NextRequest): boolean {
   const authHeader = request.headers.get("authorization")
   const expectedToken = MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS

   if (!authHeader) {
      console.warn("MinIO webhook: Missing authorization header")
      return false
   }

   // Handle both "Bearer token" and direct token formats
   const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

   if (token !== expectedToken) {
      console.warn("MinIO webhook: Invalid auth token")
      return false
   }

   return true
}

/**
 * Handle MinIO webhook notifications
 * This endpoint receives notifications when files are uploaded to MinIO
 */
export async function POST(request: NextRequest) {
   try {
      // Validate auth token
      if (!validateAuthToken(request)) {
         return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }

      // Parse the webhook payload
      const body = await request.json()

      // Validate the payload structure
      const validatedPayload = webhookPayloadSchema.parse(body) as MinioWebhookPayload

      // Process each record in the payload
      for (const record of validatedPayload.Records) {
         const notification: FileUploadNotification = {
            bucketName: record.s3.bucket.name,
            objectKey: record.s3.object.key,
            fileName: record.s3.object.key.split("/").pop() || record.s3.object.key,
            fileSize: record.s3.object.size,
            contentType: record.s3.object.contentType,
            etag: record.s3.object.eTag,
            eventTime: record.eventTime,
            eventName: record.eventName,
         }

         // Handle different event types
         await handleFileUploadEvent(notification)
      }

      return NextResponse.json({ success: true, message: "Webhook processed successfully" })
   } catch (error) {
      console.error("Error processing MinIO webhook:", error)

      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }, { status: 400 })
   }
}

/**
 * Handle file upload events based on the notification
 */
async function handleFileUploadEvent(notification: FileUploadNotification) {
   console.log(`File upload notification received:`, {
      bucket: notification.bucketName,
      key: notification.objectKey,
      fileName: notification.fileName,
      size: notification.fileSize,
      contentType: notification.contentType,
      eventName: notification.eventName,
      eventTime: notification.eventTime,
   })

   // Handle different event types
   switch (notification.eventName) {
      case "s3:ObjectCreated:Put":
      case "s3:ObjectCreated:Post":
         await handleFileCreated(notification)
         break
      case "s3:ObjectRemoved:Delete":
         await handleFileDeleted(notification)
         break
      default:
         console.log(`Unhandled event type: ${notification.eventName}`)
   }
}

/**
 * Handle file creation events
 */
async function handleFileCreated(notification: FileUploadNotification) {
   // TODO: Add your business logic here
   // Examples of what you might want to do:
   // 1. Update database with file metadata
   // 2. Send notifications to users
   // 3. Trigger file processing (thumbnails, virus scanning, etc.)
   // 4. Update file status in your application
   // 5. Log the upload for analytics

   console.log(`File created: ${notification.fileName} (${notification.fileSize} bytes)`)

   // Example: You could update a database record here
   // await updateFileStatus(notification.objectKey, 'uploaded')

   // Example: You could trigger additional processing
   // await processUploadedFile(notification)
}

/**
 * Handle file deletion events
 */
async function handleFileDeleted(notification: FileUploadNotification) {
   // TODO: Add your business logic here
   // Examples:
   // 1. Update database to mark file as deleted
   // 2. Clean up related resources
   // 3. Send notifications

   console.log(`File deleted: ${notification.fileName}`)

   // Example: You could clean up database records here
   // await removeFileRecord(notification.objectKey)
}
