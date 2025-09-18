/**
 * Types for file upload operations
 */

/**
 * Configuration for file uploads
 */
export type UploadConfig = {
  /**
   * Name of the bucket to use for uploads
   */
  bucketName: string;
  
  /**
   * Folder path within the bucket
   */
  folder: string;
  
  /**
   * Array of allowed MIME types
   */
  allowedTypes: string[];
  
  /**
   * Maximum file size in megabytes
   */
  maxSizeMB: number;
};

/**
 * Upload token for a single file
 */
export type UploadToken = {
  /**
   * URL for uploading the file
   */
  uploadUrl: string;
  
  /**
   * Form data to include with the upload request
   */
  formData: Record<string, string>;
};

/**
 * Response from generating upload tokens
 */
export type GenerateTokensResponse = {
  /**
   * Array of upload tokens
   */
  tokens: UploadToken[];
  
  /**
   * Unique identifier for the batch of uploads
   */
  identifier: string;
};

/**
 * Response from finalizing or canceling uploads
 */
export type UploadActionResponse = {
  /**
   * Whether the action was successful
   */
  success: boolean;
  
  /**
   * Message describing the result
   */
  message: string;
};
