/**
 * Types for file upload handler
 */

import type { MinioClientConfig } from "../../minio/types";

/**
 * Configuration options for file upload handler
 */
export type FileUploadConfig = {
  /**
   * MinIO client configuration
   */
  minioConfig?: Partial<MinioClientConfig>;
  
  /**
   * Default bucket name to use for uploads
   */
  defaultBucketName: string;
  
  /**
   * Default folder path within the bucket
   */
  defaultUploadFolder?: string;
  
  /**
   * Webhook endpoint for file upload notifications
   */
  webhookEndpoint?: string;
  
  /**
   * Authentication token for webhook endpoint
   */
  webhookAuthToken?: string;
};

/**
 * Options for generating a presigned URL for file upload
 */
export type FileUploadUrlOptions = {
  /**
   * Bucket name to use for the upload (overrides default)
   */
  bucketName?: string;
  
  /**
   * Folder path within the bucket (overrides default)
   */
  uploadFolder?: string;
  
  /**
   * Array of allowed MIME types
   */
  allowedFileTypes?: string[];
  
  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;
  
  /**
   * Expiry time for the presigned URL in seconds
   */
  expirySeconds?: number;
  
  /**
   * Custom metadata to attach to the file
   */
  metadata?: Record<string, string>;
  
  // No originalFilename property as we always use GUIDs
};

/**
 * Options for generating multiple presigned URLs for file uploads
 */
export type MultiFileUploadOptions = FileUploadUrlOptions & {
  /**
   * Maximum number of files to allow
   */
  maxFiles: number;
};

/**
 * Response for a presigned URL generation
 */
export type FileUploadUrlResponse = {
  /**
   * The presigned URL for uploading the file
   */
  uploadUrl: string;
  
  /**
   * Form data to include with the upload request
   */
  formData: Record<string, string>;
  
  /**
   * The object key in the bucket
   */
  objectKey: string;
  
  /**
   * The bucket name used for the upload
   */
  bucketName: string;
};

/**
 * Response for multiple presigned URLs generation
 */
export type MultiFileUploadUrlResponse = {
  /**
   * Array of presigned URL responses
   */
  uploads: FileUploadUrlResponse[];
  
  /**
   * Maximum number of files allowed
   */
  maxFiles: number;
};

/**
 * Options for webhook notification setup
 */
export type NotificationOptions = {
  /**
   * Bucket name to set notifications for
   */
  bucketName?: string;
  
  /**
   * Webhook endpoint URL
   */
  webhookEndpoint: string;
  
  /**
   * Authentication token for webhook
   */
  authToken?: string;
  
  /**
   * File prefix filter
   */
  prefix?: string;
  
  /**
   * File suffix filter
   */
  suffix?: string;
  
  /**
   * S3 events to trigger notifications for
   */
  events?: string[];
};
