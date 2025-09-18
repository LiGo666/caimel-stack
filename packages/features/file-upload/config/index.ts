/**
 * Configuration for file upload feature
 */

import type { MinioClientConfig } from "../../minio/types";

/**
 * Default MinIO client configuration
 */
// Default MinIO port
const DEFAULT_MINIO_PORT = 9000;

export const DEFAULT_MINIO_CONFIG: Partial<MinioClientConfig> = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: process.env.MINIO_PORT ? Number.parseInt(process.env.MINIO_PORT, 10) : DEFAULT_MINIO_PORT,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
};

/**
 * Default webhook configuration
 */
export const DEFAULT_WEBHOOK_CONFIG = {
  endpoint: process.env.UPLOAD_WEBHOOK_ENDPOINT || "",
  authToken: process.env.UPLOAD_WEBHOOK_AUTH_TOKEN || "",
};
