import { FileUploadConfig } from "../types";

// Default configuration for file uploads
export const defaultConfig: FileUploadConfig = {
  bucketName: "uploads",
  uploadFolder: "uploads",
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  allowedFileTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/zip",
    "video/mp4",
    "video/quicktime",
    "application/octet-stream",
  ],
  maxFiles: 5,
};

// Helper function to merge custom config with defaults
export function createUploadConfig(customConfig?: Partial<FileUploadConfig>): FileUploadConfig {
  return {
    ...defaultConfig,
    ...customConfig,
  };
}
