// Client-side configuration for file uploads
// This config is used by client components and contains safe, non-sensitive settings

export interface ClientFileUploadConfig {
  // File validation
  allowedFileTypes: string[]
  maxFileSize: number // bytes
  maxFiles: number
  
  // Upload behavior
  directUploadThreshold: number // bytes - files smaller than this use direct upload
  chunkSize: number // bytes - size of each chunk for multipart uploads
  maxConcurrentUploads: number
  
  // UI settings
  showProgressDetails: boolean
  showUploadMethod: boolean
}

// Default client configuration
export const defaultClientConfig: ClientFileUploadConfig = {
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
  maxFiles: 5,
  directUploadThreshold: 50 * 1024 * 1024, // 50MB
  chunkSize: 25 * 1024 * 1024, // 25MB chunks
  maxConcurrentUploads: 4,
  showProgressDetails: true,
  showUploadMethod: true,
}

// Helper function to merge custom config with defaults
export function createClientUploadConfig(customConfig?: Partial<ClientFileUploadConfig>): ClientFileUploadConfig {
  return {
    ...defaultClientConfig,
    ...customConfig,
  }
}

// Upload method detection
export function getUploadMethod(fileSize: number, config: ClientFileUploadConfig = defaultClientConfig): 'direct' | 'chunked' {
  return fileSize > config.directUploadThreshold ? 'chunked' : 'direct'
}

// File validation helpers
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

export function getValidationError(file: File, config: ClientFileUploadConfig): string | null {
  if (!validateFileType(file, config.allowedFileTypes)) {
    return `File type not allowed. Allowed types: ${config.allowedFileTypes.join(", ")}`
  }
  
  if (!validateFileSize(file, config.maxFileSize)) {
    return `File size exceeds the maximum allowed size of ${Math.round(config.maxFileSize / (1024 * 1024))}MB`
  }
  
  return null
}
