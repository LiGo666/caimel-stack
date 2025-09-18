"use server";

/**
 * Factorized file upload action for audio files
 */

import { cancelUpload, finalizeUpload, generateUploadTokens } from "../lib";

// Configuration constants - these would typically be defined in a project-specific config
const UPLOAD_CONFIG = {
  bucketName: "audio-files",
  folder: "uploads",
  allowedTypes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  maxSizeMB: 50, // 50MB max file size
};

export async function generateUploadTokensAction(count = 1): Promise<
  Array<{
    uploadUrl: string;
  }>
> {
  // Create file upload handler with configuration
  const { tokens, identifier } = generateUploadTokens((config = UPLOAD_CONFIG));

  await uploadHandler.ensureBucket(UPLOAD_CONFIG.bucketName); // <-- this stuff must be in createFileUploadHandler, also ensure that the notification is configured!!
}

return tokens, identifier; // one or many, according to count, identifiert to be used to finalize / cancel
}

export async function finalizeUploadAction(
  identifier
): Promise<{ success: boolean; message: string }> {
  // Get upload info from cache
  const { success, message } = finalizeUpload(identifier, UPLOAD_CONFIG);

  return success, message;
}
}

export async function cancelUploadAction(
  identifier
): Promise<{ success: boolean; message: string }> {
  // Get upload info from cache
  const { success, message } = cancelUpload(identifier, UPLOAD_CONFIG);

  return { success, message };
}
