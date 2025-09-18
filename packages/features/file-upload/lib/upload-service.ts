/**
 * File Upload Service
 *
 * Provides core functionality for file uploads using MinIO
 */

import { randomUUID } from "node:crypto";
import { MinioObjectStorageClient } from "../../minio";
import { DEFAULT_WEBHOOK_CONFIG } from "../config";
import type {
  GenerateTokensResponse,
  UploadActionResponse,
  UploadConfig,
  UploadToken,
} from "../types";

// Constants
const BYTES_IN_KB = 1024;
const BYTES_IN_MB = BYTES_IN_KB * BYTES_IN_KB;
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

// No URL fixing - we'll configure MinIO correctly instead

// Cache for upload tokens
const tokenCache = new Map<
  string,
  {
    tokens: Array<{
      uploadUrl: string;
      formData: Record<string, string>;
      objectKey: string;
      bucketName: string;
    }>;
    config: UploadConfig;
  }
>();

/**
 * Convert megabytes to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export function mbToBytes(mb: number): number {
  return mb * BYTES_IN_MB;
}

/**
 * Generate upload tokens for files
 *
 * @param count - Number of upload tokens to generate
 * @param config - Upload configuration
 * @returns Upload tokens and identifier
 */
export async function generateUploadTokens(
  config: UploadConfig,
  count = 1
): Promise<GenerateTokensResponse> {
  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Ensure bucket exists
  const bucketExists = await client.bucketExists(config.bucketName);
  if (!bucketExists) {
    await client.makeBucket(config.bucketName);
  }

  // Set up webhook notifications if endpoint is configured
  if (DEFAULT_WEBHOOK_CONFIG.endpoint) {
    await client.setBucketNotification(config.bucketName, {
      webhookEndpoint: DEFAULT_WEBHOOK_CONFIG.endpoint,
      authToken: DEFAULT_WEBHOOK_CONFIG.authToken,
      prefix: config.folder,
      events: ["s3:ObjectCreated:*"],
    });
  }

  // Generate tokens
  const tokens: UploadToken[] = [];
  const internalTokens: Array<{
    uploadUrl: string;
    formData: Record<string, string>;
    objectKey: string;
    bucketName: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    // Generate a unique object key
    const uuid = randomUUID();
    const objectKey = config.folder ? `${config.folder}/${uuid}` : uuid;

    // Generate presigned URL
    const response = await client.generatePresignedUrl(
      config.bucketName,
      objectKey,
      {
        expiry: DEFAULT_EXPIRY_SECONDS,
        maxFileSize: mbToBytes(config.maxSizeMB),
        contentType:
          config.allowedTypes.length === 1 ? config.allowedTypes[0] : undefined,
      }
    );
    
    // Log the presigned URL from MinIO
    // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
    console.log("Presigned URL from MinIO:", response.url);
    
    // Add to tokens
    tokens.push({
      uploadUrl: response.url,
      formData: response.formData,
    });

    // Add to internal tokens
    internalTokens.push({
      uploadUrl: response.url,
      formData: response.formData,
      objectKey,
      bucketName: config.bucketName,
    });
  }

  // Generate a unique identifier for this batch
  const identifier = randomUUID();

  // Store in cache
  tokenCache.set(identifier, {
    tokens: internalTokens,
    config,
  });

  // Return tokens and identifier
  return {
    tokens,
    identifier,
  };
}

/**
 * Finalize an upload
 *
 * @param identifier - Identifier from generateUploadTokens
 * @param config - Upload configuration (for verification)
 * @returns Success status and message
 */
export async function finalizeUpload(
  identifier: string,
  config: UploadConfig
): Promise<UploadActionResponse> {
  // Get upload info from cache
  const uploadInfo = tokenCache.get(identifier);

  if (!uploadInfo) {
    return {
      success: false,
      message: "Upload identifier not found",
    };
  }

  // Verify config matches
  if (uploadInfo.config.bucketName !== config.bucketName) {
    return {
      success: false,
      message: "Configuration mismatch",
    };
  }

  // For simple uploads, there's nothing to finalize
  // This would contain implementation for multi-part uploads if needed

  // In a real implementation, we might need to await some operations here
  await Promise.resolve();

  // Clean up cache
  tokenCache.delete(identifier);

  return {
    success: true,
    message: "Upload finalized successfully",
  };
}

/**
 * Cancel an upload
 *
 * @param identifier - Identifier from generateUploadTokens
 * @param config - Upload configuration (for verification)
 * @returns Success status and message
 */
export async function cancelUpload(
  identifier: string,
  config: UploadConfig
): Promise<UploadActionResponse> {
  // Get upload info from cache
  const uploadInfo = tokenCache.get(identifier);

  if (!uploadInfo) {
    return {
      success: false,
      message: "Upload identifier not found",
    };
  }

  // Verify config matches
  if (uploadInfo.config.bucketName !== config.bucketName) {
    return {
      success: false,
      message: "Configuration mismatch",
    };
  }

  // For simple uploads, there's nothing to cancel
  // This would contain implementation for multi-part uploads if needed

  // In a real implementation, we might need to abort multipart uploads here
  await Promise.resolve();

  // Clean up cache
  tokenCache.delete(identifier);

  return {
    success: true,
    message: "Upload cancelled successfully",
  };
}
