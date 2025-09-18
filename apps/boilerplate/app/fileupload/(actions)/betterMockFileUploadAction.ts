"use server";

/**
 * Factorized file upload action for audio files
 * This shows the intended usage pattern for the file upload feature
 */

import type {
  GenerateTokensResponse,
  UploadActionResponse,
} from "@features/file-upload";
// Import the core functions from the library
import {
  cancelUpload,
  finalizeUpload,
  generateUploadTokens,
} from "@features/file-upload";

// Configuration constants - these would typically be defined in a project-specific config
const UPLOAD_CONFIG = {
  bucketName: "audio-files",
  folder: "uploads",
  allowedTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  maxSizeMB: 50, // 50MB max file size
};

/**
 * Generate upload tokens for files
 *
 * @param count - Number of upload tokens to generate
 * @returns Array of upload URLs and a shared identifier for the batch
 */
export async function generateUploadTokensAction(
  count = 1
): Promise<GenerateTokensResponse> {
  // The generateUploadTokens function handles all the complexity:
  // - Ensuring the bucket exists
  // - Setting up notifications
  // - Generating presigned URLs
  // - Creating a unique identifier for the batch
  return await generateUploadTokens(UPLOAD_CONFIG, count);
}

/**
 * Finalize an upload after it's complete
 *
 * @param identifier - The identifier returned from generateUploadTokens
 * @returns Success status and message
 */
export async function finalizeUploadAction(
  identifier: string
): Promise<UploadActionResponse> {
  // The finalizeUpload function handles all the complexity:
  // - Looking up the upload information
  // - Completing any necessary operations
  // - Cleaning up resources
  return await finalizeUpload(identifier, UPLOAD_CONFIG);
}

/**
 * Cancel an upload if there's an error
 *
 * @param identifier - The identifier returned from generateUploadTokens
 * @returns Success status and message
 */
export async function cancelUploadAction(
  identifier: string
): Promise<UploadActionResponse> {
  // The cancelUpload function handles all the complexity:
  // - Looking up the upload information
  // - Aborting any in-progress uploads
  // - Cleaning up resources
  return await cancelUpload(identifier, UPLOAD_CONFIG);
}
