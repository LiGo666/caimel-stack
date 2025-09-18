"use server";

/**
 * Factorized file upload action for audio files
 * This shows the intended usage pattern for the file upload feature
 */

// Import the core functions from the library
import {
  cancelUpload,
  finalizeUpload,
  generateUploadTokens,
} from "@features/file-upload/lib/upload-service";
import type {
  GenerateTokensResponse,
  UploadActionResponse,
} from "@features/file-upload/types";

// Configuration constants - these would typically be defined in a project-specific config
const UPLOAD_CONFIG = {
  bucketName: "audio-files2",
  folder: "uploads",
  allowedTypes: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "text/plain",
    "application/pdf",
  ],
  maxSizeMB: 5000, // 50MB max file size
};

export async function generateUploadTokensAction(
  count = 1
): Promise<GenerateTokensResponse> {
  return await generateUploadTokens(UPLOAD_CONFIG, count);
}

export async function finalizeUploadAction(
  identifier: string
): Promise<UploadActionResponse> {
  return await finalizeUpload(identifier, UPLOAD_CONFIG);
}

export async function cancelUploadAction(
  identifier: string
): Promise<UploadActionResponse> {
  return await cancelUpload(identifier, UPLOAD_CONFIG);
}
