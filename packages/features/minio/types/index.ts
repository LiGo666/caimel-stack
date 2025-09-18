/**
 * Types for MinIO client operations
 */

import type { Client as MinioClient } from "minio";

/**
 * Configuration options for initializing the MinIO client
 * 
 * Can be provided in two ways:
 * 1. Using MINIO_ENDPOINT as a full URI (https://upload.caimel.tools)
 * 2. Using MINIO_HOST, MINIO_PORT, and MINIO_SSL separately
 */
export type MinioClientConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
}

/**
 * Options for presigned URL generation
 */
export type PresignedUrlOptions = {
  expiry?: number;
  contentType?: string;
  maxFileSize?: number;
}

/**
 * Response for presigned URL generation
 */
export type PresignedUrlResponse = {
  url: string;
  formData: Record<string, string>;
}

/**
 * Options for multipart upload initialization
 */
export type MultipartUploadOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Response for multipart upload initialization
 */
export type MultipartUploadInitResponse = {
  uploadId: string;
  key: string;
  bucket: string;
}

/**
 * Options for generating presigned URLs for multipart upload parts
 */
export type PresignedPartUrlOptions = {
  expiry?: number;
}

/**
 * Response for presigned part URL generation
 */
export type PresignedPartUrlResponse = {
  url: string;
  partNumber: number;
}

/**
 * Part information for completing multipart uploads
 */
export type MultipartUploadPart = {
  partNumber: number;
  etag: string;
}

/**
 * Options for bucket notification configuration
 */
export type BucketNotificationOptions = {
  events: string[];
  prefix?: string;
  suffix?: string;
  webhookEndpoint: string;
  authToken?: string;
}

/**
 * Error response from MinIO operations
 */
export interface MinioError extends Error {
  code?: string;
  statusCode?: number;
  resource?: string;
  bucketName?: string;
  objectName?: string;
}

/**
 * Object storage client interface
 */
export type ObjectStorageClient = {
  // Client management
  getClient(): MinioClient;
  
  // Bucket operations
  bucketExists(bucketName: string): Promise<boolean>;
  makeBucket(bucketName: string, region?: string): Promise<void>;
  removeBucket(bucketName: string, force?: boolean): Promise<void>;
  
  // Object operations
  generatePresignedUrl(
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<PresignedUrlResponse>;
  
  // Multipart upload operations
  initiateMultipartUpload(
    bucketName: string,
    objectName: string,
    options?: MultipartUploadOptions
  ): Promise<MultipartUploadInitResponse>;
  
  generatePresignedPartUrl(
    bucketName: string,
    objectName: string,
    params: {
      uploadId: string;
      partNumber: number;
      options?: PresignedPartUrlOptions;
    }
  ): Promise<PresignedPartUrlResponse>;
  
  completeMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<void>;
  
  abortMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string
  ): Promise<void>;
  
  // Notification operations
  setBucketNotification(
    bucketName: string,
    options: BucketNotificationOptions
  ): Promise<void>;
  
  // Response structure varies based on notification configuration
  getBucketNotification(bucketName: string): Promise<Record<string, unknown>>;
  
  removeBucketNotification(bucketName: string): Promise<void>;
}
