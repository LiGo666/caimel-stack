export interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
}

export interface BucketConfig {
  name: string;
  region?: string;
}

export interface PresignedUrlOptions {
  bucketName: string;
  objectName: string;
  expiry?: number; // in seconds
  contentType?: string;
  maxSizeBytes?: number; // Maximum allowed file size in bytes
}

export interface PresignedUrlResult {
  url: string;
  fields?: Record<string, string>;
  key: string;
}

export interface ObjectInfo {
  name: string;
  prefix: string;
  size: number;
  etag: string;
  lastModified: Date;
}

export interface ListObjectsOptions {
  bucketName: string;
  prefix?: string;
  recursive?: boolean;
  maxKeys?: number;
}

// Multipart upload types
export interface MultipartUploadOptions {
  bucketName: string;
  objectName: string;
  contentType?: string;
  partCount: number;
  expiry?: number; // in seconds
}

export interface MultipartUploadInitResult {
  uploadId: string;
  key: string;
  parts: MultipartUploadPart[];
  completeUrl?: string;
}

export interface MultipartUploadPart {
  partNumber: number;
  url: string;
}

export interface MultipartUploadCompleteOptions {
  bucketName: string;
  objectName: string;
  uploadId: string;
  parts: MultipartUploadCompletePart[];
}

export interface MultipartUploadCompletePart {
  partNumber: number;
  etag: string;
}

export interface NotificationOptions {
  bucketName: string;
  endpoint: string;
  prefix?: string;
  suffix?: string;
  events?: string[];
  authToken?: string;
}
