import { Client } from "minio"
import {
   BucketConfig,
   ListObjectsOptions,
   MinioConfig,
   MultipartUploadCompleteOptions,
   MultipartUploadCompletePart,
   MultipartUploadInitResult,
   MultipartUploadOptions,
   ObjectInfo,
   PresignedUrlOptions,
   PresignedUrlResult,
} from "../types"
import { defaultMinioConfig } from "../config/minio-config"

/**
 * MinioClient class for handling operations with MinIO
 */
export class MinioClient {
   private client: Client
   private config: MinioConfig

   constructor(config: MinioConfig = defaultMinioConfig) {
      this.config = config

      console.log(`[MinioClient] Creating client with endpoint: ${config.endpoint}`)
      console.log(`[MinioClient] Access key provided: ${config.accessKey ? '✓' : '✗'}`)
      console.log(`[MinioClient] Secret key provided: ${config.secretKey ? '✓' : '✗'}`)
      
      try {
         this.client = new Client({ 
            endPoint: config.endpoint, 
            useSSL: true, 
            accessKey: config.accessKey, 
            secretKey: config.secretKey,
            port: 443 // Explicitly set port for HTTPS
         })
         
         console.log(`[MinioClient] Client created successfully with configuration:`, {
            endPoint: config.endpoint,
            useSSL: true,
            port: 443,
            tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED
         })
      } catch (error) {
         console.error(`[MinioClient] Failed to create client:`, error)
         throw new Error(`Failed to initialize MinioClient: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   /**
    * Check if a bucket exists
    */
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

   /**
    * Create a new bucket
    */
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

   /**
    * Generate a presigned URL for uploading an object
    */
   async generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResult> {
      try {
         const { bucketName, objectName, expiry = 3600, contentType } = options
         
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

         // Set content length range (5GB max)
         const maxSizeBytes = 5 * 1024 * 1024 * 1024 // 5GB
         console.log(`[MinioClient] Setting content length range: 0-${maxSizeBytes} (5GB)`)
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

   /**
    * Get a temporary URL for downloading an object
    */
   async getPresignedObjectUrl(bucketName: string, objectName: string, expiry = 3600): Promise<string> {
      try {
         return await this.client.presignedGetObject(bucketName, objectName, expiry)
      } catch (error) {
         console.error("Error getting presigned object URL:", error)
         throw new Error(`Failed to get presigned object URL: ${error.message}`)
      }
   }

   /**
    * List objects in a bucket
    */
   async listObjects(options: ListObjectsOptions): Promise<ObjectInfo[]> {
      try {
         const { bucketName, prefix = "", recursive = true, maxKeys = 1000 } = options

         const stream = this.client.listObjects(bucketName, prefix, recursive)

         return new Promise((resolve, reject) => {
            const objects: ObjectInfo[] = []

            stream.on("data", (obj) => {
               if (objects.length < maxKeys) {
                  objects.push({ name: obj.name, prefix: obj.prefix || "", size: obj.size, etag: obj.etag, lastModified: obj.lastModified })
               }
            })

            stream.on("error", (err) => {
               reject(err)
            })

            stream.on("end", () => {
               resolve(objects)
            })
         })
      } catch (error) {
         console.error("Error listing objects:", error)
         return []
      }
   }

   /**
    * Remove an object from a bucket
    */
   async removeObject(bucketName: string, objectName: string): Promise<boolean> {
      try {
         await this.client.removeObject(bucketName, objectName)
         return true
      } catch (error) {
         console.error("Error removing object:", error)
         return false
      }
   }

   /**
    * Initialize a multipart upload
    * @param options Options for initializing a multipart upload
    * @returns Result containing uploadId and presigned URLs for each part
    */
   async initMultipartUpload(options: MultipartUploadOptions): Promise<MultipartUploadInitResult> {
      console.log(`[MinioClient] Initializing multipart upload with options:`, {
         bucketName: options.bucketName,
         objectName: options.objectName,
         contentType: options.contentType,
         partCount: options.partCount,
         expiry: options.expiry
      })
      
      try {
         const { bucketName, objectName, contentType, partCount, expiry = 3600 } = options

         // Ensure bucket exists
         console.log(`[MinioClient] Checking if bucket exists: ${bucketName}`)
         const bucketExists = await this.bucketExists(bucketName)
         if (!bucketExists) {
            console.log(`[MinioClient] Bucket ${bucketName} does not exist, creating it...`)
            await this.createBucket({ name: bucketName })
            console.log(`[MinioClient] Bucket ${bucketName} created successfully`)
         } else {
            console.log(`[MinioClient] Bucket ${bucketName} already exists`)
         }

         // Create a multipart upload
         console.log(`[MinioClient] Initiating new multipart upload for ${objectName} in bucket ${bucketName}`)
         const metaData = { "Content-Type": contentType || "application/octet-stream" }
         console.log(`[MinioClient] Using metadata:`, metaData)
         
         const uploadId = await new Promise<string>((resolve, reject) => {
            // @ts-ignore - The minio client types don't match the actual implementation
            this.client.initiateNewMultipartUpload(bucketName, objectName, metaData, (err: any, uploadId?: string) => {
               if (err) {
                  console.error(`[MinioClient] Failed to initiate multipart upload:`, err)
                  reject(err)
                  return
               }
               console.log(`[MinioClient] Multipart upload initiated with uploadId: ${uploadId}`)
               resolve(uploadId || "")
            })
         })

         if (!uploadId) {
            console.error(`[MinioClient] No uploadId received from initiateNewMultipartUpload`)
            throw new Error('Failed to get uploadId for multipart upload')
         }

         // Generate presigned URLs for each part
         console.log(`[MinioClient] Generating ${partCount} presigned URLs for parts`)
         const parts = await Promise.all(
            Array.from({ length: partCount }, async (_, i) => {
               const partNumber = i + 1
               try {
                  // For multipart uploads, we need to construct the URL with query parameters
                  console.log(`[MinioClient] Generating presigned URL for part ${partNumber}`)
                  const baseUrl = await this.client.presignedPutObject(bucketName, objectName, expiry)
                  console.log(`[MinioClient] Base URL for part ${partNumber}: ${baseUrl.substring(0, 50)}...`)

                  // Append the required query parameters for multipart upload
                  const url = `${baseUrl}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`
                  console.log(`[MinioClient] Final URL for part ${partNumber}: ${url.substring(0, 50)}...`)
                  return { partNumber, url }
               } catch (error) {
                  console.error(`[MinioClient] Error generating presigned URL for part ${partNumber}:`, error)
                  throw error
               }
            }),
         )

         console.log(`[MinioClient] Successfully generated ${parts.length} presigned URLs`)
         return { uploadId, key: objectName, parts }
      } catch (error) {
         console.error(`[MinioClient] Error initializing multipart upload:`, error)
         console.error(`[MinioClient] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
         throw new Error(`Failed to initialize multipart upload: ${error instanceof Error ? error.message : String(error)}`)
      }
   }

   /**
    * Complete a multipart upload
    * @param options Options for completing a multipart upload
    * @returns True if the multipart upload was completed successfully
    */
   async completeMultipartUpload(options: MultipartUploadCompleteOptions): Promise<boolean> {
      try {
         const { bucketName, objectName, uploadId, parts } = options

         // Format parts for the minio client
         const etags = parts.map((part) => ({ partNumber: part.partNumber, etag: part.etag }))

         // Complete the multipart upload
         await new Promise<void>((resolve, reject) => {
            // @ts-ignore - The minio client types don't match the actual implementation
            this.client.completeMultipartUpload(bucketName, objectName, uploadId, etags as any, (err: any) => {
               if (err) {
                  reject(err)
                  return
               }
               resolve()
            })
         })

         return true
      } catch (error) {
         console.error("Error completing multipart upload:", error)
         return false
      }
   }

   /**
    * Abort a multipart upload
    * @param bucketName The name of the bucket
    * @param objectName The name of the object
    * @param uploadId The upload ID
    * @returns True if the multipart upload was aborted successfully
    */
   async abortMultipartUpload(bucketName: string, objectName: string, uploadId: string): Promise<boolean> {
      try {
         await new Promise<void>((resolve, reject) => {
            // @ts-ignore - The minio client types don't match the actual implementation
            this.client.abortMultipartUpload(bucketName, objectName, uploadId, (err: any) => {
               if (err) {
                  reject(err)
                  return
               }
               resolve()
            })
         })

         return true
      } catch (error) {
         console.error("Error aborting multipart upload:", error)
         return false
      }
   }
}
