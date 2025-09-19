/** biome-ignore-all lint/style/noMagicNumbers: <explanation> */
"use client";

/**
 * Extended functionality for the useFileUpload hook to support multipart uploads
 */

"use client";

import { MULTIPART_UPLOAD } from "../types/multipart";
import type { MultipartUploadPart } from "../types/multipart";

// Constants for progress calculation
const PROGRESS_MAX = 100;

/**
 * Check if a file should use multipart upload based on its size
 *
 * @param fileSize - Size of the file in bytes
 * @returns Whether to use multipart upload
 */
export function shouldUseMultipartUpload(fileSize: number): boolean {
  return fileSize > MULTIPART_UPLOAD.THRESHOLD;
}

/**
 * Split a file into chunks for multipart upload
 *
 * @param file - File to split
 * @param chunkSize - Size of each chunk in bytes
 * @returns Array of file chunks
 */
export function splitFileIntoChunks(
  file: File,
  chunkSize = MULTIPART_UPLOAD.CHUNK_SIZE
): Blob[] {
  const chunks: Blob[] = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }

  return chunks;
}

/**
 * Calculate optimal chunk size based on file size
 *
 * @param fileSize - Size of the file in bytes
 * @returns Optimal chunk size in bytes
 */
export function calculateOptimalChunkSize(fileSize: number): number {
  // Constants for file size thresholds
  const ONE_GB = 1024 * 1024 * 1024;
  const FIVE_GB = 5 * ONE_GB;

  // For very large files, use larger chunks
  if (fileSize > FIVE_GB) {
    return 50 * 1024 * 1024; // 50MB chunks
  }

  if (fileSize > ONE_GB) {
    return 25 * 1024 * 1024; // 25MB chunks
  }

  // Default chunk size
  return MULTIPART_UPLOAD.CHUNK_SIZE; // 5MB chunks
}

/**
 * Upload a chunk of a file
 *
 * @param url - URL to upload to
 * @param chunk - Chunk to upload
 * @param onProgress - Progress callback
 * @returns ETag of the uploaded chunk
 */
export async function uploadChunk(
  url: string,
  chunk: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * PROGRESS_MAX);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      const HTTP_OK_MIN = 200;
      const HTTP_OK_MAX = 300;
      if (xhr.status >= HTTP_OK_MIN && xhr.status < HTTP_OK_MAX) {
        // Extract ETag from response headers
        const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "") || "";
        resolve(etag);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error occurred"));
    });

    xhr.open("PUT", url);
    xhr.send(chunk);
  });
}

/**
 * Process a multipart upload
 * 
 * @param token - Upload token with multipart information
 * @param file - File to upload
 * @param onProgress - Progress callback
 * @param onPartComplete - Callback when a part is complete
 * @returns Array of completed parts
 */
export async function processMultipartUpload(
  token: Record<string, unknown>,
  file: File,
  onProgress?: (progress: number) => void,
  onPartComplete?: (part: MultipartUploadPart) => void
): Promise<MultipartUploadPart[]> {
  if (!token.isMultipart || !token.uploadId || !token.objectKey || !token.bucketName) {
    throw new Error("Invalid token for multipart upload");
  }
  
  // Split file into chunks
  const chunkSize = calculateOptimalChunkSize(file.size);
  const chunks = splitFileIntoChunks(file, chunkSize);
  
  // Track progress for each chunk
  const chunkProgress = new Array(chunks.length).fill(0);
  const updateTotalProgress = (chunkIndex: number, progress: number) => {
    chunkProgress[chunkIndex] = progress;
    
    // Calculate overall progress
    if (onProgress) {
      const totalProgress = Math.round(
        chunkProgress.reduce((sum, p) => sum + p, 0) / chunks.length
      );
      onProgress(totalProgress);
    }
  };
  
  // Upload chunks sequentially
  const parts: MultipartUploadPart[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const partNumber = i + 1;
    const chunk = chunks[i];
    
    try {
      // Get presigned URL for this part
      const partUrl = await getPresignedPartUrl(token, partNumber);
      
      // Upload the chunk
      const etag = await uploadChunk(partUrl, chunk, (progress) => {
        updateTotalProgress(i, progress);
      });
      
      // Add part information
      const part = { partNumber, etag };
      parts.push(part);
      
      // Notify about completed part
      if (onPartComplete) {
        onPartComplete(part);
      }
    } catch (error) {
      console.error(`Error uploading part ${partNumber}:`, error);
      throw error;
    }
  }
  
  return parts;
}

/**
 * Get a presigned URL for uploading a part
 * 
 * @param token - Upload token with multipart information
 * @param partNumber - Part number (1-based)
 * @returns Presigned URL for uploading the part
 */
async function getPresignedPartUrl(token: Record<string, unknown>, partNumber: number): Promise<string> {
  // In a real implementation, you would call a server action to get the presigned URL
  // For now, we'll just simulate it
  return `https://upload.caimel.tools/presigned-part-url/${token.bucketName}/${token.objectKey}?partNumber=${partNumber}&uploadId=${token.uploadId}`;
}
