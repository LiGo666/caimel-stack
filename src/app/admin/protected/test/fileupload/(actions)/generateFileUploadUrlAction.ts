"use server";

import type { FileUploadConfig } from "@/features/file-upload";
import { generateFileUploadUrl } from "@/features/file-upload";

// Constants for file size limits
const MAX_FILE_SIZE_MB = 5000; // 5000MB
// biome-ignore lint/style/noMagicNumbers: Standard conversion constant for MB to bytes
const MB_IN_BYTES = 1024 * 1024; // 1MB in bytes

export async function generateFileUploadUrlAction(
  fileName: string,
  fileType: string,
  fileSize: number
) {
  const customConfig: Partial<FileUploadConfig> = {
    // Server-side configuration that overrides client-side settings
    bucketName: "ups-hehe",
    uploadFolder: "sexyshit666",
    allowedFileTypes: ["audio/mpeg", "application/zip"],
    maxFileSize: MAX_FILE_SIZE_MB * MB_IN_BYTES, // Convert MB to bytes
    maxFiles: 1, // Maximum number of files allowed
  };

  return await generateFileUploadUrl(
    { fileName, fileType, fileSize },
    customConfig
  );
}
