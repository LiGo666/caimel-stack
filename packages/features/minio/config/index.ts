/**
 * Configuration values for MinIO operations
 *
 * This module provides validated configuration settings for MinIO client.
 * Required environment variables are validated using envalid.
 */

import { bool, cleanEnv, num, str, url } from "envalid";
import "server-only";

/**
 * Validate required environment variables
 */
const env = cleanEnv(process.env, {
  // Primary configuration - ENDPOINT as URI
  MINIO_ENDPOINT: url({
    desc: "MinIO server endpoint as full URI (e.g., https://upload.caimel.tools)",
    example: "https://upload.caimel.tools",
    default: "", // Empty default to check if it's set
  }),

  // Fallback configuration - HOST, PORT, SSL
  MINIO_HOST: str({
    desc: "MinIO server hostname (fallback if ENDPOINT not provided)",
    example: "localhost",
    default: "localhost",
  }),
  MINIO_PORT: num({
    desc: "MinIO server port (fallback if ENDPOINT not provided)",
    example: "9000",
    default: 9000,
  }),
  MINIO_SSL: bool({
    desc: "Whether to use SSL for MinIO connection (fallback if ENDPOINT not provided)",
    default: false,
  }),

  // Required credentials
  MINIO_ACCESS_KEY: str({
    desc: "MinIO access key",
    example: "minioadmin",
  }),
  MINIO_SECRET_KEY: str({
    desc: "MinIO secret key",
    example: "minioadmin",
  }),
});

/**
 * Parse MinIO configuration from environment variables
 * Prefers MINIO_ENDPOINT as a URI when set, otherwise falls back to MINIO_HOST, MINIO_PORT, MINIO_SSL
 */
function parseMinioConfig() {
  // Check if ENDPOINT is provided
  if (env.MINIO_ENDPOINT) {
    try {
      // Parse the endpoint URL
      const endpointUrl = new URL(env.MINIO_ENDPOINT);

      // Default ports based on protocol
      const DEFAULT_HTTPS_PORT = 443;
      const DEFAULT_HTTP_PORT = 80;

      // Determine if using SSL based on protocol
      const useSSL = endpointUrl.protocol === "https:";

      // Set default port based on protocol if not specified
      const defaultPort = useSSL ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT;

      return {
        endPoint: endpointUrl.hostname,
        port: endpointUrl.port
          ? Number.parseInt(endpointUrl.port, 10)
          : defaultPort,
        useSSL,
        accessKey: env.MINIO_ACCESS_KEY,
        secretKey: env.MINIO_SECRET_KEY,
        region: process.env.MINIO_REGION || "",
      };
    } catch (_error) {
      // If URL parsing fails, fall back to HOST/PORT configuration
    }
  }

  // Fallback to HOST, PORT, SSL configuration
  return {
    endPoint: env.MINIO_HOST,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    region: process.env.MINIO_REGION || "",
  };
}

/**
 * MinIO configuration object with validated settings
 */
export const minioConfig = parseMinioConfig();

// For backward compatibility
export const DEFAULT_MINIO_CONFIG = minioConfig;

// Default expiry time for presigned URLs in seconds (1 hour)
export const DEFAULT_PRESIGNED_URL_EXPIRY = 3600;

// Default max file size for uploads (5GB)
// biome-ignore lint/style/noMagicNumbers: <calculation>
export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Default S3 events for notifications
export const DEFAULT_S3_EVENTS = ["s3:ObjectCreated:*"];

// Default region for bucket creation
export const DEFAULT_REGION = "us-east-1";

// Constants for policy creation
export const CONTENT_TYPE_HEADER = "Content-Type";

// Constants for multipart uploads
export const UPLOAD_ID_PARAM = "upload-id";
export const PART_NUMBER_PARAM = "part-number";

// Constants for ARN configuration
export const ARN_SERVICE = "minio";
export const ARN_TYPE = "sqs";
export const ARN_REGION = "us-east-1";
export const ARN_ACCOUNT = "1";
export const ARN_RESOURCE = "webhook";
