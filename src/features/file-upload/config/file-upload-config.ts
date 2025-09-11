import { FileUploadConfig, FileType } from "../types";

// Default configuration for file uploads
export const defaultFileUploadConfig: FileUploadConfig = {
  bucketName: "uploads",
  uploadFolder: "uploads",
  maxFileSize: 5 * 1024 * 1024, // 5MB
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
  ] as FileType[],
  maxFiles: 1,
};

// Helper function to merge custom config with defaults
export function createFileUploadConfig(customConfig?: Partial<FileUploadConfig>): FileUploadConfig {
  return {
    ...defaultFileUploadConfig,
    ...customConfig,
  };
}
