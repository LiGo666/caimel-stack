import { Client, NotificationConfig, QueueConfig, buildARN } from "minio"
import { BucketConfig, MinioConfig, NotificationOptions, PresignedUrlOptions, PresignedUrlResult } from "../types"
import { MINIO_HOST, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_NOTIFY_WEBHOOK_ENDPOINT, MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS } from "@/features/env"
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_PRESIGNED_URL_EXPIRY, DEFAULT_S3_EVENTS } from "../config/minio-defaults"

/**
 * MinioClient class for handling operations with MinIO
 */
export class MinioClient {
   private client: Client
   private config: MinioConfig

   constructor(config: MinioConfig = { endpoint: MINIO_HOST, accessKey: MINIO_ACCESS_KEY, secretKey: MINIO_SECRET_KEY }) {
      this.config = config

      console.log(`[MinioClient] Creating client with endpoint: ${config.endpoint}`)

      try {
         this.client = new Client({ endPoint: config.endpoint, accessKey: config.accessKey, secretKey: config.secretKey })

         console.log(`[MinioClient] Client created successfully with configuration:`, { endPoint: config.endpoint })
      } catch (error) {
         console.error(`[MinioClient] Failed to create client:`, error)
         throw new Error(`Failed to initialize MinioClient: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   async bucketExists(bucketName: string): Promise<boolean> {
      try {
         console.log(`[MinioClient] Checking if bucket exists: ${bucketName}`)
         const exists = await this.client.bucketExists(bucketName)
         console.log(`[MinioClient] Bucket ${bucketName} exists: ${exists}`)
         return exists
      } catch (error) {
         console.error(`[MinioClient] Error checking if bucket exists (${bucketName}):`, error)
         return false
      }
   }

   async createBucket(bucketConfig: BucketConfig): Promise<boolean> {
      try {
         const exists = await this.bucketExists(bucketConfig.name)
         if (!exists) {
            await this.client.makeBucket(bucketConfig.name, bucketConfig.region)
         }
         return true
      } catch (error) {
         console.error("Error creating bucket:", error)
         return false
      }
   }

   async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResult> {
      try {
         const { bucketName, objectName, expiry = DEFAULT_PRESIGNED_URL_EXPIRY, contentType, maxSizeBytes = DEFAULT_MAX_FILE_SIZE } = options

         console.log(`[MinioClient] Generating presigned URL for bucket: ${bucketName}, object: ${objectName}`)
         console.log(`[MinioClient] Using endpoint: ${this.config.endpoint}`)

         // Ensure bucket exists
         const bucketExists = await this.bucketExists(bucketName)
         if (!bucketExists) {
            console.log(`[MinioClient] Bucket ${bucketName} does not exist, creating it...`)
            await this.createBucket({ name: bucketName })
         }

         // Create a new PostPolicy object
         console.log(`[MinioClient] Creating new post policy`)
         const policy = this.client.newPostPolicy()

         // Set policy expiration
         const expirationDate = new Date(Date.now() + expiry * 1000)
         console.log(`[MinioClient] Setting policy expiration to: ${expirationDate.toISOString()}`)
         policy.setExpires(expirationDate)

         // Set bucket and object name
         console.log(`[MinioClient] Setting policy bucket: ${bucketName}, key: ${objectName}`)
         policy.setBucket(bucketName)
         policy.setKey(objectName)

         // Set content length range using the provided maxSizeBytes or default
         console.log(`[MinioClient] Setting content length range: 0-${maxSizeBytes} (${Math.round(maxSizeBytes / (1024 * 1024 * 1024))}GB)`)
         policy.setContentLengthRange(0, maxSizeBytes)

         // Set content type if provided
         if (contentType) {
            console.log(`[MinioClient] Setting content type: ${contentType}`)
            policy.setContentType(contentType)
         }

         // Generate presigned URL
         console.log(`[MinioClient] Generating presigned post policy URL`)
         const presignedUrl = await this.client.presignedPostPolicy(policy)

         console.log(`[MinioClient] Generated presigned URL: ${presignedUrl.postURL}`)
         console.log(`[MinioClient] With fields:`, presignedUrl.formData)

         return { url: presignedUrl.postURL, fields: presignedUrl.formData, key: objectName }
      } catch (error) {
         console.error(`[MinioClient] Error generating presigned URL for ${options.bucketName}/${options.objectName}:`, error)
         console.error(`[MinioClient] Error stack:`, error.stack)
         throw new Error(`Failed to generate presigned URL: ${error.message}`)
      }
   }

   async bucketNotificationExists(bucketName: string): Promise<boolean> {
      try {
         console.log(`[MinioClient] Checking if bucket notifications exist for: ${bucketName}`)
         
         return await new Promise<boolean>((resolve, reject) => {
            this.client.getBucketNotification(bucketName, (err: any, notifications: any) => {
               if (err) {
                  console.error(`[MinioClient] Error checking bucket notifications:`, err)
                  // Resolve with false instead of rejecting
                  resolve(false)
                  return
               }
               
               // Check if there are any notification configurations
               const hasNotifications = (
                  (notifications.cloudFunctionConfiguration && Object.keys(notifications.cloudFunctionConfiguration).length > 0) ||
                  (notifications.queueConfiguration && notifications.queueConfiguration.length > 0) ||
                  (notifications.topicConfiguration && notifications.topicConfiguration.length > 0) ||
                  (notifications.lambdaFunctionConfiguration && notifications.lambdaFunctionConfiguration.length > 0)
               )
               
               console.log(`[MinioClient] Bucket ${bucketName} has notifications: ${hasNotifications}`)
               resolve(hasNotifications || false) // Ensure we always return a boolean
            })
         })
      } catch (error) {
         console.error(`[MinioClient] Error checking bucket notifications:`, error)
         return false
      }
   }

   async setBucketNotification(options: NotificationOptions): Promise<boolean> {
      try {
         const { bucketName, prefix, suffix, events } = options

         // Use environment variables for webhook endpoint and auth token
         console.log(`[MinioClient] Setting up bucket notification for ${bucketName} to endpoint ${MINIO_NOTIFY_WEBHOOK_ENDPOINT}`)

         // Create notification configuration
         const config = new NotificationConfig()

         // Build ARN for the webhook using the correct format
         // Format: arn:minio:sqs::NEXTJS:webhook
         const arn = buildARN("minio", "sqs", "", "NEXTJS", "webhook")

         // Create a new queue configuration with the ARN
         const queue = new QueueConfig(arn)

         // Add filters if provided
         if (prefix) {
            console.log(`[MinioClient] Adding prefix filter: ${prefix}`)
            queue.addFilterPrefix(prefix)
         }

         if (suffix) {
            console.log(`[MinioClient] Adding suffix filter: ${suffix}`)
            queue.addFilterSuffix(suffix)
         }

         // Add events (default to ObjectCreatedAll if none specified)
         const eventsToAdd = events?.length ? events : DEFAULT_S3_EVENTS
         eventsToAdd.forEach((event) => {
            console.log(`[MinioClient] Adding event: ${event}`)
            queue.addEvent(event)
         })

         console.log(`[MinioClient] Using authentication token: MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS`)
         console.log(`[MinioClient] Using webhook endpoint: ${MINIO_NOTIFY_WEBHOOK_ENDPOINT}`)

         // Add the queue to the config
         config.add(queue)

         // Set the bucket notification
         await new Promise<void>((resolve, reject) => {
            this.client.setBucketNotification(bucketName, config, (err: any) => {
               if (err) {
                  console.error(`[MinioClient] Error setting bucket notification:`, err)
                  reject(err)
                  return
               }
               console.log(`[MinioClient] Successfully set up bucket notification for ${bucketName}`)
               resolve()
            })
         })

         return true
      } catch (error) {
         console.error("Error setting bucket notification:", error)
         return false
      }
   }
}
