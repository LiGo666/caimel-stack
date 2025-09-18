/**
 * Core functions for file upload tokens
 * These functions implement the token-based API for file uploads
 */

import { randomUUID } from "node:crypto";
import { createFileUploadHandler, mbToBytes } from "./file-upload-handler";
import type { FileUploadUrlResponse } from "./types";

// Cache for upload tokens
const tokenCache = new Map<string, {
  tokens: Array<{
    uploadUrl: string;
    formData: Record<string, string>;
    objectKey: string;
    bucketName: string;
    uploadId?: string;
  }>;
  config: UploadConfig;
}>();

// Type for upload configuration
export type UploadConfig = {
  bucketName: string;
  folder: string;
  allowedTypes: string[];
  maxSizeMB: number;
  webhookEndpoint?: string;
  webhookAuthToken?: string;
};

/**
 * Generate upload tokens for files
 * 
 * @param count - Number of upload tokens to generate
 * @param config - Upload configuration
 * @returns Upload tokens and identifier
 */
export async function generateUploadTokens(
  count = 1,
  config: UploadConfig
): Promise<{
  tokens: Array<{
    uploadUrl: string;
    formData: Record<string, string>;
  }>;
  identifier: string;
}> {
  // Create file upload handler
  const uploadHandler = createFileUploadHandler({
    defaultBucketName: config.bucketName,
    defaultUploadFolder: config.folder,
    webhookEndpoint: config.webhookEndpoint,
    webhookAuthToken: config.webhookAuthToken,
  });
  
  // Ensure bucket exists
  await uploadHandler.ensureBucket(config.bucketName);
  
  // Set up notifications if webhook endpoint is provided
  if (config.webhookEndpoint) {
    await uploadHandler.setupNotifications({
      bucketName: config.bucketName,
      webhookEndpoint: config.webhookEndpoint,
      authToken: config.webhookAuthToken,
      prefix: config.folder,
    });
  }
  
  // Generate upload URLs
  const uploadResponses: FileUploadUrlResponse[] = [];
  for (let i = 0; i < count; i++) {
    const response = await uploadHandler.getUploadUrl({
      allowedFileTypes: config.allowedTypes,
      maxFileSize: mbToBytes(config.maxSizeMB),
    });
    uploadResponses.push(response);
  }
  
  // Create tokens from responses
  const tokens = uploadResponses.map(response => ({
    uploadUrl: response.uploadUrl,
    formData: response.formData,
    objectKey: response.objectKey,
    bucketName: response.bucketName,
  }));
  
  // Generate a unique identifier for this batch
  const identifier = randomUUID();
  
  // Store in cache
  tokenCache.set(identifier, {
    tokens,
    config,
  });
  
  // Return tokens and identifier
  return {
    tokens: tokens.map(token => ({
      uploadUrl: token.uploadUrl,
      formData: token.formData,
    })),
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
): Promise<{ success: boolean; message: string }> {
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
  
  // For multi-part uploads, we would need to complete them here
  // This is a simplified implementation
  
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
): Promise<{ success: boolean; message: string }> {
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
  
  // For multi-part uploads, we would need to abort them here
  // This is a simplified implementation
  
  // Clean up cache
  tokenCache.delete(identifier);
  
  return {
    success: true,
    message: "Upload cancelled successfully",
  };
}
