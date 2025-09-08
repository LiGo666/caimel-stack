import { z } from "zod";

// Schema for file upload request validation
export const fileUploadRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive"),
  config: z.object({
    bucketName: z.string().optional(),
    uploadFolder: z.string().optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    maxFileSize: z.number().optional(),
  }).optional(),
});

export type FileUploadRequestSchema = z.infer<typeof fileUploadRequestSchema>;

// Schema for file upload configuration validation
export const fileUploadConfigSchema = z.object({
  allowedFileTypes: z.array(z.string()),
  maxFileSize: z.number().positive(),
  maxFiles: z.number().positive(),
  uploadFolder: z.string(),
  bucketName: z.string(),
});

export type FileUploadConfigSchema = z.infer<typeof fileUploadConfigSchema>;

// Schema for multipart upload initialization request
export const multipartUploadInitSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive"),
  partSize: z.number().positive("Part size must be positive").default(8 * 1024 * 1024), // Default 8MB chunks
  config: z.object({
    bucketName: z.string().optional(),
    uploadFolder: z.string().optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    maxFileSize: z.number().optional(),
  }).optional(),
});

export type MultipartUploadInitSchema = z.infer<typeof multipartUploadInitSchema>;

// Schema for multipart upload completion request
export const multipartUploadCompleteSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  key: z.string().min(1, "Object key is required"),
  parts: z.array(
    z.object({
      partNumber: z.number().positive("Part number must be positive"),
      etag: z.string().min(1, "ETag is required"),
    })
  ),
  config: z.object({
    bucketName: z.string().optional(),
  }).optional(),
});

export type MultipartUploadCompleteSchema = z.infer<typeof multipartUploadCompleteSchema>;

// Schema for multipart upload abort request
export const multipartUploadAbortSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  key: z.string().min(1, "Object key is required"),
  config: z.object({
    bucketName: z.string().optional(),
  }).optional(),
});

export type MultipartUploadAbortSchema = z.infer<typeof multipartUploadAbortSchema>;
