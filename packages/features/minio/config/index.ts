/**
 * Default configuration values for MinIO operations
 */

// Default expiry time for presigned URLs in seconds (1 hour)
export const DEFAULT_PRESIGNED_URL_EXPIRY = 3600;

// Default max file size for uploads (1GB)
// biome-ignore lint/style/noMagicNumbers: <calculation>
export const DEFAULT_MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;

// Default S3 events for notifications
export const DEFAULT_S3_EVENTS = ["s3:ObjectCreated:*"];

// Default MinIO client configuration
export const DEFAULT_MINIO_CONFIG = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  // biome-ignore lint/style/noMagicNumbers: <default port number>
  port: process.env.MINIO_PORT ? Number.parseInt(process.env.MINIO_PORT, 10) : 9000,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
  region: process.env.MINIO_REGION || "",
};

// Default region for bucket creation
export const DEFAULT_REGION = "us-east-1";

// Constants for policy creation
export const CONTENT_TYPE_HEADER = "Content-Type";

// Constants for multipart uploads
export const UPLOAD_ID_PARAM = "upload-id";
export const PART_NUMBER_PARAM = "part-number";

// Constants for ARN configuration
export const ARN_SERVICE = "aws";
export const ARN_TYPE = "sqs";
export const ARN_REGION = "us-east-1";
export const ARN_ACCOUNT = "1";
export const ARN_RESOURCE = "webhook";
