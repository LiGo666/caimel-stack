"use server";

/**
 * Factorized file upload action for audio files
 */

import { randomUUID } from "node:crypto";
import { createFileUploadHandler, mbToBytes } from "../lib";
import { DEFAULT_MINIO_CONFIG, DEFAULT_WEBHOOK_CONFIG } from "../config";

// Configuration constants - these would typically be defined in a project-specific config
const UPLOAD_CONFIG = {
  bucketName: "audio-files",
  folder: "uploads",
  allowedTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  maxSizeMB: 50, // 50MB max file size
};

// Cache for upload IDs to track uploads
const uploadCache = new Map<string, {
  uploadId?: string;
  objectKey: string;
  bucketName: string;
}>();

/**
 * Generate upload tokens for audio files
 * 
 * @param count - Number of upload tokens to generate (default: 1)
 * @returns Array of upload tokens
 */
export async function generateUploadTokens(count = 1): Promise<Array<{
  tokenId: string;
  uploadUrl: string;
  formData: Record<string, string>;
}>> {
  // Create file upload handler with configuration
  const uploadHandler = createFileUploadHandler({
    minioConfig: DEFAULT_MINIO_CONFIG,
    defaultBucketName: UPLOAD_CONFIG.bucketName,
    defaultUploadFolder: UPLOAD_CONFIG.folder,
    webhookEndpoint: DEFAULT_WEBHOOK_CONFIG.endpoint,
    webhookAuthToken: DEFAULT_WEBHOOK_CONFIG.authToken,
  });
  
  // Ensure bucket exists and set up notifications (happens under the hood)
  await uploadHandler.ensureBucket(UPLOAD_CONFIG.bucketName);
  
  // Only set up notifications if webhook endpoint is configured
  if (DEFAULT_WEBHOOK_CONFIG.endpoint) {
    await uploadHandler.setupNotifications({
      bucketName: UPLOAD_CONFIG.bucketName,
      webhookEndpoint: DEFAULT_WEBHOOK_CONFIG.endpoint,
      authToken: DEFAULT_WEBHOOK_CONFIG.authToken,
      prefix: UPLOAD_CONFIG.folder,
    });
  }
  
  // Generate tokens
  const tokens: Array<{
    tokenId: string;
    uploadUrl: string;
    formData: Record<string, string>;
  }> = [];
  
  for (let i = 0; i < count; i++) {
    // Generate upload URL
    const response = await uploadHandler.getUploadUrl({
      allowedFileTypes: UPLOAD_CONFIG.allowedTypes,
      maxFileSize: mbToBytes(UPLOAD_CONFIG.maxSizeMB),
    });
    
    // Generate a token ID
    const tokenId = randomUUID();
    
    // Store in cache for later use
    uploadCache.set(tokenId, {
      objectKey: response.objectKey,
      bucketName: response.bucketName,
    });
    
    // Return token info
    tokens.push({
      tokenId,
      uploadUrl: response.uploadUrl,
      formData: response.formData,
    });
  }
  
  return tokens;
}

/**
 * Finalize an upload
 * 
 * @param tokenId - Token ID from generateUploadTokens
 * @returns Success status
 */
export async function finalizeUpload(tokenId: string): Promise<{ success: boolean; message: string }> {
  // Get upload info from cache
  const uploadInfo = uploadCache.get(tokenId);
  
  if (!uploadInfo) {
    return {
      success: false,
      message: "Upload token not found",
    };
  }
  
  // For simple uploads, there's nothing to finalize
  // This would contain implementation for multi-part uploads
  
  // Clean up cache
  uploadCache.delete(tokenId);
  
  // In a real implementation, we might need to await some operations here
  await Promise.resolve();
  
  return {
    success: true,
    message: "Upload finalized successfully",
  };
}

/**
 * Cancel an upload
 * 
 * @param tokenId - Token ID from generateUploadTokens
 * @returns Success status
 */
export async function cancelUpload(tokenId: string): Promise<{ success: boolean; message: string }> {
  // Get upload info from cache
  const uploadInfo = uploadCache.get(tokenId);
  
  if (!uploadInfo) {
    return {
      success: false,
      message: "Upload token not found",
    };
  }
  
  // For multi-part uploads, we would abort the upload
  if (uploadInfo.uploadId) {
    try {
      // In a real implementation, we would abort the multipart upload here
      await Promise.resolve();
    } catch (error) {
      return {
        success: false,
        message: `Failed to cancel upload: ${(error as Error).message}`,
      };
    }
  }
  
  // Clean up cache
  uploadCache.delete(tokenId);
  
  return {
    success: true,
    message: "Upload cancelled successfully",
  };
}

/**
 * Factory function to create a file upload action with custom configuration
 * 
 * @param config - Custom configuration
 * @returns Object with upload action functions
 */
export function createFileUploadAction(config: {
  bucketName: string;
  folder: string;
  allowedTypes: string[];
  maxSizeMB: number;
}) {
  // Override the default configuration
  UPLOAD_CONFIG.bucketName = config.bucketName;
  UPLOAD_CONFIG.folder = config.folder;
  UPLOAD_CONFIG.allowedTypes = config.allowedTypes;
  UPLOAD_CONFIG.maxSizeMB = config.maxSizeMB;
  
  return {
    generateUploadTokens,
    finalizeUpload,
    cancelUpload,
  };
}

/**
 * Example usage in a project-specific action:
 * 
 * "use server";
 * 
 * import { createFileUploadAction } from "@/packages/features/file-upload/examples/audioFileUploadAction";
 * 
 * const { generateUploadTokens, finalizeUpload, cancelUpload } = createFileUploadAction({
 *   bucketName: "my-project-files",
 *   folder: "user-uploads",
 *   allowedTypes: ["application/pdf", "image/jpeg"],
 *   maxSizeMB: 10,
 * });
 * 
 * export { generateUploadTokens, finalizeUpload, cancelUpload };
 */
