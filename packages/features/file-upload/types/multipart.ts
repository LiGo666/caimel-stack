/**
 * Types for multipart upload functionality
 */

/**
 * Part information for multipart uploads
 */
export type MultipartUploadPart = {
  /**
   * Part number (1-based)
   */
  partNumber: number;

  /**
   * ETag returned by the server after uploading the part
   */
  etag: string;
};

/**
 * State of a multipart upload
 */
export type MultipartUploadState = {
  /**
   * Upload ID returned by the server when initiating a multipart upload
   */
  uploadId: string;

  /**
   * Parts that have been uploaded successfully
   */
  parts: MultipartUploadPart[];

  /**
   * Object key in the bucket
   */
  objectKey: string;

  /**
   * Name of the bucket
   */
  bucketName: string;
};

/**
 * Constants for byte calculations
 */
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

// Size constants
const MB_10 = 10;
const MB_5 = 5;

// Concurrency constant
const DEFAULT_CONCURRENCY = 3;

/**
 * Configuration for multipart uploads
 */
export const MULTIPART_UPLOAD = {
  /**
   * Threshold for using multipart upload (10MB)
   */
  THRESHOLD: MB_10 * BYTES_PER_MB,

  /**
   * Size of each chunk for multipart uploads (5MB)
   */
  CHUNK_SIZE: MB_5 * BYTES_PER_MB,

  /**
   * Maximum number of concurrent chunk uploads
   */
  MAX_CONCURRENT_CHUNKS: DEFAULT_CONCURRENCY,
};
