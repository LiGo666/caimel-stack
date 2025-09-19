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
import { MULTIPART_UPLOAD } from "../types/multipart";
import type { MultipartUploadPart } from "../types/multipart";
import { 
  initiateMultipartUpload, 
  completeMultipartUpload as completeMultipart,
  abortMultipartUpload as abortMultipart,
  trackCompletedPart,
  generatePresignedPartUrl
} from "./multipart-service";

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
      isMultipart?: boolean;
      uploadId?: string;
      tokenId?: string; // Token ID for client reference
      multipartToken?: string; // Token for multipart operations
    }>;
    config: UploadConfig;
  }
>();

// Cache for tracking parts of multipart uploads
const partsCache = new Map<string, MultipartUploadPart[]>();

/**
 * Convert megabytes to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export function mbToBytes(mb: number): number {
  return mb * BYTES_IN_MB;
}

// Type for token processing
type TokenInfo = {
  uploadUrl: string;
  formData: Record<string, string>;
  objectKey: string;
  bucketName: string;
  isMultipart?: boolean;
  uploadId?: string;
  tokenId?: string;
  multipartToken?: string;
};

/**
 * Generate upload tokens for files
 *
 * @param config - Upload configuration
 * @param count - Number of upload tokens to generate
 * @param options - Additional options
 * @returns Upload tokens and identifier
 */
export async function generateUploadTokens(
  config: UploadConfig,
  count = 1,
  options?: { forceMultipart?: boolean; fileSize?: number }
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

  // Determine if we should use multipart upload
  // Use multipart if explicitly forced or if file size exceeds the threshold
  const useMultipart = options?.forceMultipart || 
    (options?.fileSize !== undefined && options.fileSize > MULTIPART_UPLOAD.THRESHOLD);

  // Generate tokens
  const tokens: UploadToken[] = [];
  const internalTokens: TokenInfo[] = [];

  // Process each token
  for (let i = 0; i < count; i++) {
    // Generate a unique object key
    const uuid = randomUUID();
    const objectKey = config.folder ? `${config.folder}/${uuid}` : uuid;

    if (useMultipart) {
      await processMultipartToken(config, objectKey, tokens, internalTokens);
    } else {
      await processSimpleToken(config, objectKey, tokens, internalTokens);
    }
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
 * Process a simple upload token
 */
async function processSimpleToken(
  config: UploadConfig,
  objectKey: string,
  tokens: UploadToken[],
  internalTokens: TokenInfo[]
): Promise<void> {
  // Create MinIO client
  const client = new MinioObjectStorageClient();
  
  // Simple upload - generate presigned URL
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
  console.log("Presigned URL for simple upload:", response.url);
  
  // Add to tokens
  tokens.push({
    uploadUrl: response.url,
    formData: response.formData,
    isMultipart: false,
  });

  // Add to internal tokens
  internalTokens.push({
    uploadUrl: response.url,
    formData: response.formData,
    objectKey,
    bucketName: config.bucketName,
    isMultipart: false,
  });
}

/**
 * Process a multipart upload token
 */
async function processMultipartToken(
  config: UploadConfig,
  objectKey: string,
  tokens: UploadToken[],
  internalTokens: TokenInfo[]
): Promise<void> {
  // Multipart upload - initiate multipart upload
  const contentType = config.allowedTypes.length === 1 ? config.allowedTypes[0] : undefined;
  const { uploadId, token } = await initiateMultipartUpload(config.bucketName, objectKey, contentType);
  
  // Log the multipart upload initialization
  // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
  console.log("Initiated multipart upload:", { bucketName: config.bucketName, objectKey, uploadId, token });
  
  // Create a token ID for client reference
  const tokenId = randomUUID();
  
  // Initialize parts cache for this token
  partsCache.set(tokenId, []);
  
  // Add to tokens
  tokens.push({
    uploadUrl: "", // No direct upload URL for multipart
    formData: {}, // No form data for multipart
    isMultipart: true,
    uploadId,
    objectKey,
    bucketName: config.bucketName,
    tokenId, // Add token ID for client reference
  });

  // Add to internal tokens
  internalTokens.push({
    uploadUrl: "",
    formData: {},
    objectKey,
    bucketName: config.bucketName,
    isMultipart: true,
    uploadId,
    tokenId, // Add token ID for client reference
    multipartToken: token, // Store the multipart token for server-side operations
  });
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

  try {
    // Check if any tokens are multipart uploads
    const multipartTokens = uploadInfo.tokens.filter(token => token.isMultipart);
    
    if (multipartTokens.length > 0) {
      // Handle multipart uploads
      for (const token of multipartTokens) {
        if (token.multipartToken) {
          // Complete the multipart upload using the server-side token
          await completeMultipart(token.multipartToken);
          
          // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
          console.log("Completed multipart upload:", { 
            bucketName: token.bucketName, 
            objectKey: token.objectKey 
          });
        }
      }
    }
    
    // Clean up cache
    tokenCache.delete(identifier);
    
    return {
      success: true,
      message: "Upload finalized successfully",
    };
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
    console.error("Error finalizing upload:", error);
    
    return {
      success: false,
      message: `Error finalizing upload: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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

  try {
    // Check if any tokens are multipart uploads
    const multipartTokens = uploadInfo.tokens.filter(token => token.isMultipart);
    
    if (multipartTokens.length > 0) {
      // Handle multipart uploads
      for (const token of multipartTokens) {
        if (token.multipartToken) {
          // Abort the multipart upload using the server-side token
          await abortMultipart(token.multipartToken);
          
          // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
          console.log("Aborted multipart upload:", { 
            bucketName: token.bucketName, 
            objectKey: token.objectKey 
          });
        }
      }
    }
    
    // Clean up cache
    tokenCache.delete(identifier);
    
    return {
      success: true,
      message: "Upload cancelled successfully",
    };
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: This is for debugging purposes
    console.error("Error cancelling upload:", error);
    
    // Still delete from cache even if there's an error
    tokenCache.delete(identifier);
    
    return {
      success: false,
      message: `Error cancelling upload: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a presigned URL for uploading a part
 * 
 * @param tokenId - Token ID from the client
 * @param partNumber - Part number (1-based)
 * @returns Presigned URL for uploading the part
 */
export async function getPresignedPartUrl(
  tokenId: string,
  partNumber: number
): Promise<{ url: string }> {
  // Find the token in the cache
  let multipartToken: string | undefined;
  
  // Search through all identifiers in the token cache
  for (const [, uploadInfo] of tokenCache.entries()) {
    // Find the token with the matching tokenId
    const token = uploadInfo.tokens.find(t => t.isMultipart && t.tokenId === tokenId);
    if (token?.multipartToken) {
      multipartToken = token.multipartToken;
      break;
    }
  }
  
  if (!multipartToken) {
    throw new Error(`Multipart upload not found for token ID: ${tokenId}`);
  }
  
  // Get presigned URL for the part
  const response = await generatePresignedPartUrl(multipartToken, partNumber);
  
  return { url: response.url };
}

/**
 * Track a completed part for a multipart upload
 * 
 * @param tokenId - Token ID from the client
 * @param partNumber - Part number (1-based)
 * @param etag - ETag returned by the server
 */
export async function trackPart(
  tokenId: string,
  partNumber: number,
  etag: string
): Promise<void> {
  // Find the token in the cache
  let multipartToken: string | undefined;
  
  // Search through all identifiers in the token cache
  for (const [, uploadInfo] of tokenCache.entries()) {
    // Find the token with the matching tokenId
    const token = uploadInfo.tokens.find(t => t.isMultipart && t.tokenId === tokenId);
    if (token?.multipartToken) {
      multipartToken = token.multipartToken;
      break;
    }
  }
  
  if (!multipartToken) {
    throw new Error(`Multipart upload not found for token ID: ${tokenId}`);
  }
  
  // Track the completed part
  trackCompletedPart(multipartToken, { partNumber, etag });
  
  // Add a small delay to simulate async operation for linting purposes
  await Promise.resolve();
}
