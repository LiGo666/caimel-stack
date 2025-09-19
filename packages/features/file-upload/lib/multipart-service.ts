/**
 * Multipart upload service
 *
 * Provides functions for handling multipart uploads
 */

import { randomUUID } from "node:crypto";
import { MinioObjectStorageClient } from "../../minio";
import type { PresignedPartUrlResponse } from "../../minio/types";
import type { MultipartUploadPart, MultipartUploadState } from "../types/multipart";

// Cache for tracking multipart uploads
const multipartUploadsCache = new Map<string, MultipartUploadState>();

/**
 * Initiate a multipart upload
 *
 * @param bucketName - Name of the bucket
 * @param objectKey - Object key in the bucket
 * @param contentType - Optional content type
 * @returns Upload ID, object key, and token
 */
export async function initiateMultipartUpload(
  bucketName: string,
  objectKey: string,
  contentType?: string
): Promise<{ uploadId: string; objectKey: string; token: string }> {
  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Ensure bucket exists
  const bucketExists = await client.bucketExists(bucketName);
  if (!bucketExists) {
    await client.makeBucket(bucketName);
  }

  // Initiate multipart upload
  const options = contentType ? { contentType } : undefined;
  const response = await client.initiateMultipartUpload(
    bucketName,
    objectKey,
    options
  );

  // Generate a unique token for this multipart upload
  const token = randomUUID();
  
  // Store in cache
  multipartUploadsCache.set(token, {
    uploadId: response.uploadId,
    objectKey: response.key,
    bucketName,
    parts: [],
  });

  return {
    uploadId: response.uploadId,
    objectKey: response.key,
    token, // Return the token for future reference
  };
}

/**
 * Generate a presigned URL for uploading a part
 *
 * @param token - Token from initiateMultipartUpload
 * @param partNumber - Part number (1-based)
 * @returns Presigned URL for uploading the part
 */
export async function generatePresignedPartUrl(
  token: string,
  partNumber: number
): Promise<PresignedPartUrlResponse> {
  // Get upload info from cache
  const uploadInfo = multipartUploadsCache.get(token);
  if (!uploadInfo) {
    throw new Error(`Multipart upload not found for token: ${token}`);
  }

  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Generate presigned URL for the part
  return await client.generatePresignedPartUrl(uploadInfo.bucketName, uploadInfo.objectKey, {
    uploadId: uploadInfo.uploadId,
    partNumber,
  });
}

/**
 * Get multipart upload info by token
 *
 * @param token - Token from initiateMultipartUpload
 * @returns Multipart upload state
 */
export function getMultipartUploadInfo(token: string): MultipartUploadState {
  const uploadInfo = multipartUploadsCache.get(token);
  if (!uploadInfo) {
    throw new Error(`Multipart upload not found for token: ${token}`);
  }
  return uploadInfo;
}

/**
 * Track a completed part
 *
 * @param token - Token from initiateMultipartUpload
 * @param part - Part information
 */
export function trackCompletedPart(token: string, part: MultipartUploadPart): void {
  const uploadInfo = multipartUploadsCache.get(token);
  if (!uploadInfo) {
    throw new Error(`Multipart upload not found for token: ${token}`);
  }
  
  // Add part to the list
  uploadInfo.parts.push(part);
  
  // Sort parts by part number
  uploadInfo.parts.sort((a, b) => a.partNumber - b.partNumber);
}

/**
 * Complete a multipart upload
 *
 * @param token - Token from initiateMultipartUpload
 * @param parts - Optional array of parts that were uploaded (if not provided, uses cached parts)
 * @returns Object key of the completed upload
 */
export async function completeMultipartUpload(
  token: string,
  parts?: MultipartUploadPart[]
): Promise<string> {
  // Get upload info from cache
  const uploadInfo = multipartUploadsCache.get(token);
  if (!uploadInfo) {
    throw new Error(`Multipart upload not found for token: ${token}`);
  }
  
  // Use provided parts or cached parts
  const partsToUse = parts ?? uploadInfo.parts;
  
  if (partsToUse.length === 0) {
    throw new Error("No parts found to complete multipart upload");
  }
  
  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Complete multipart upload
  await client.completeMultipartUpload(
    uploadInfo.bucketName, 
    uploadInfo.objectKey, 
    uploadInfo.uploadId, 
    partsToUse
  );
  
  // Clean up cache
  multipartUploadsCache.delete(token);
  
  return uploadInfo.objectKey;
}

/**
 * Abort a multipart upload
 *
 * @param token - Token from initiateMultipartUpload
 */
export async function abortMultipartUpload(token: string): Promise<void> {
  // Get upload info from cache
  const uploadInfo = multipartUploadsCache.get(token);
  if (!uploadInfo) {
    throw new Error(`Multipart upload not found for token: ${token}`);
  }
  
  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Abort multipart upload
  await client.abortMultipartUpload(
    uploadInfo.bucketName, 
    uploadInfo.objectKey, 
    uploadInfo.uploadId
  );
  
  // Clean up cache
  multipartUploadsCache.delete(token);
}

/**
 * Generate a unique object key
 *
 * @param folder - Optional folder path
 * @returns Unique object key
 */
export function generateObjectKey(folder?: string): string {
  const uuid = randomUUID();
  return folder ? `${folder}/${uuid}` : uuid;
}
