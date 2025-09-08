// Server-side configuration for file uploads
// This config is used by server actions and contains server-specific settings

export interface ServerFileUploadConfig {
  // Storage settings
  bucketName: string
  uploadFolder: string
  
  // File validation (server-side enforcement)
  allowedFileTypes: string[]
  maxFileSize: number // bytes
  
  // Upload settings
  presignedUrlExpiry: number // seconds
  multipartUploadExpiry: number // seconds
  
  // Performance settings
  maxConcurrentParts: number
  retryAttempts: number
  
  // Security settings
  validateContentType: boolean
  enforceSizeLimit: boolean
}

// Default server configuration
export const defaultServerConfig: ServerFileUploadConfig = {
  bucketName: "uploads",
  uploadFolder: "large-uploads",
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
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  presignedUrlExpiry: 3600, // 1 hour
  multipartUploadExpiry: 3600, // 1 hour
  maxConcurrentParts: 10,
  retryAttempts: 3,
  validateContentType: true,
  enforceSizeLimit: true,
}

// Helper function to merge custom config with defaults
export function createServerUploadConfig(customConfig?: Partial<ServerFileUploadConfig>): ServerFileUploadConfig {
  return {
    ...defaultServerConfig,
    ...customConfig,
  }
}

// Server-side validation
export function validateUploadRequest(
  fileName: string,
  fileType: string, 
  fileSize: number,
  config: ServerFileUploadConfig = defaultServerConfig
): { valid: boolean; error?: string } {
  // Validate file type
  if (config.validateContentType && !config.allowedFileTypes.includes(fileType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${config.allowedFileTypes.join(", ")}`
    }
  }
  
  // Validate file size
  if (config.enforceSizeLimit && fileSize > config.maxFileSize) {
    return {
      valid: false, 
      error: `File size exceeds the maximum allowed size of ${Math.round(config.maxFileSize / (1024 * 1024))}MB`
    }
  }
  
  return { valid: true }
}

// Generate safe object name
export function generateObjectName(fileName: string, uploadFolder: string): string {
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  return `${uploadFolder}/${timestamp}-${randomId}${fileExtension}`
}
