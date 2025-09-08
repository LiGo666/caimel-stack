import "server-only"

// Server-side barrel export - only server actions, config, and shared types

// Server actions
export {
  getPresignedUrl,
  getFileUrl,
  deleteFile,
  listFiles,
  initMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
} from "./actions/upload"

// Server configuration
export {
  createServerUploadConfig,
  defaultServerConfig,
  validateUploadRequest,
  generateObjectName,
  type ServerFileUploadConfig,
} from "./config/server-config"

// Shared types (used by both client and server)
export type {
  FileUploadConfig,
  FileUploadRequest,
  FileUploadResponse,
  UploadedFile,
  MultipartUploadRequest,
  MultipartUploadInitResponse,
  MultipartUploadCompletePart,
  MultipartUploadCompleteRequest,
  MultipartUploadCompleteResponse,
  MultipartUploadAbortRequest,
  MultipartUploadAbortResponse,
} from "./types"
