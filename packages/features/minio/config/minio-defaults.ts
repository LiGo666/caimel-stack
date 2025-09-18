/**
 * Default configuration values for MinIO operations
 */

// Default expiry time for presigned URLs in seconds (1 hour)
export const DEFAULT_PRESIGNED_URL_EXPIRY = 3600;

// Default max file size for uploads (1GB)
export const DEFAULT_MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;

// Default S3 events for notifications
export const DEFAULT_S3_EVENTS = ["s3:ObjectCreated:*"];
