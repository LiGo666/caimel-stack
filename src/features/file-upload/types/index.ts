/**
 * Supported file types for uploads
 * This provides intellisense for allowedFileTypes
 */
export type FileType =
   | "image/jpeg"
   | "image/png"
   | "image/gif"
   | "application/pdf"
   | "text/plain"
   | "application/zip"
   | "video/mp4"
   | "video/quicktime"
   | "application/octet-stream"
   | "audio/mpeg"

export interface FileUploadConfig {
   allowedFileTypes: FileType[]
   maxFileSize: number // in bytes
   maxFiles: number
   uploadFolder: string
   bucketName: string
}

export interface PresignedUrlResponse {
   url: string
   fields?: Record<string, string>
   key: string
}

export interface FileUploadRequest {
   fileName: string
   fileType: string
   fileSize: number
}

export interface FileUploadResponse {
   success: boolean
   presignedUrl?: PresignedUrlResponse
   error?: string
}

export interface UploadedFile {
   key: string
   name: string
   size: number
   type: string
   url: string
}

// Multipart upload types
export interface MultipartUploadRequest {
   fileName: string
   fileType: string
   fileSize: number
   partSize?: number // in bytes, default is 8MB
}

export interface MultipartUploadPart {
   partNumber: number
   url: string
}

export interface MultipartUploadInitResponse {
   success: boolean
   uploadId?: string
   key?: string
   parts?: MultipartUploadPart[]
   error?: string
}

export interface MultipartUploadCompletePart {
   partNumber: number
   etag: string
}

export interface MultipartUploadCompleteRequest {
   uploadId: string
   key: string
   parts: MultipartUploadCompletePart[]
}

export interface MultipartUploadCompleteResponse {
   success: boolean
   key?: string
   url?: string
   error?: string
}

export interface MultipartUploadAbortRequest {
   uploadId: string
   key: string
}

export interface MultipartUploadAbortResponse {
   success: boolean
   error?: string
}

// MinIO Webhook Types
export interface MinioWebhookEvent {
   eventVersion: string
   eventSource: string
   awsRegion: string
   eventTime: string
   eventName: string
   userIdentity: { principalId: string }
   requestParameters: { sourceIPAddress: string }
   responseElements: { "x-amz-request-id": string; "x-minio-origin-endpoint": string }
   s3: {
      s3SchemaVersion: string
      configurationId: string
      bucket: { name: string; ownerIdentity: { principalId: string }; arn: string }
      object: { key: string; size: number; eTag: string; contentType: string; userMetadata: Record<string, string>; sequencer: string }
   }
}

export interface MinioWebhookPayload {
   EventName: string
   Key: string
   Records: MinioWebhookEvent[]
}

export interface FileUploadNotification {
   bucketName: string
   objectKey: string
   fileName: string
   fileSize: number
   contentType: string
   etag: string
   eventTime: string
   eventName: string
}
