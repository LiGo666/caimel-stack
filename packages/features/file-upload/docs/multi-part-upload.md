# Multipart Upload Implementation Plan

## Overview

This document outlines the implementation plan for adding multipart upload support to the file-upload feature. Multipart uploads are necessary for handling large files efficiently and reliably, especially when dealing with files that exceed server-side size limits.

## Current Limitations

1. **Single-Part Uploads Only**: The current implementation only supports simple (single-part) uploads for all files.
2. **Size Limitations**: Files larger than a certain threshold (default 50MB in the client, 5GB on the server) may fail with HTTP 413 (Payload Too Large) errors.
3. **No Chunking Logic**: Large files are not split into smaller chunks, which can cause timeouts and failures.

## Implementation Requirements

### 1. Configuration Constants

Add the following constants to define when and how to use multipart uploads:

```typescript
// Threshold for using multipart upload (e.g., 10MB)
export const MULTIPART_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

// Size of each chunk for multipart uploads (e.g., 5MB)
export const MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;

// Maximum number of concurrent chunk uploads
export const MAX_CONCURRENT_CHUNKS = 3;
```

### 2. Server-Side Changes

#### 2.1. Upload Service (`lib/upload-service.ts`)

Extend the current implementation to support multipart uploads:

1. **Add Multipart Upload Functions**:
   - `initiateMultipartUpload`: Start a multipart upload and get an uploadId
   - `generatePresignedPartUrl`: Generate a presigned URL for uploading a specific part
   - `completeMultipartUpload`: Finalize the multipart upload after all parts are uploaded
   - `abortMultipartUpload`: Cancel a multipart upload if there's an error

2. **Update Token Generation**:
   - Add a flag to indicate if a file should use multipart upload
   - Include necessary information for multipart uploads in the token

3. **Update Token Cache**:
   - Store additional information for multipart uploads (uploadId, parts)
   - Update the finalize and cancel functions to handle multipart uploads

#### 2.2. Types (`types/index.ts`)

Add new types to support multipart uploads:

```typescript
export type MultipartUploadPart = {
  partNumber: number;
  etag: string;
};

export type UploadToken = {
  uploadUrl: string;
  formData: Record<string, string>;
  isMultipart?: boolean;
  uploadId?: string;
};

export type MultipartUploadState = {
  uploadId: string;
  parts: MultipartUploadPart[];
  objectKey: string;
  bucketName: string;
};
```

### 3. Client-Side Changes

#### 3.1. File Upload Hook (`hooks/useFileUpload.ts`)

1. **Add File Size Check**:
   - Determine whether to use simple or multipart upload based on file size
   - For files smaller than the threshold, continue using simple upload
   - For files larger than the threshold, use multipart upload

2. **Implement Chunking Logic**:
   ```typescript
   function splitFileIntoChunks(file: File, chunkSize: number): Blob[] {
     const chunks: Blob[] = [];
     let start = 0;
     
     while (start < file.size) {
       const end = Math.min(start + chunkSize, file.size);
       chunks.push(file.slice(start, end));
       start = end;
     }
     
     return chunks;
   }
   ```

3. **Implement Multipart Upload Flow**:
   - Initiate multipart upload
   - Split file into chunks
   - Upload each chunk with progress tracking
   - Complete multipart upload after all chunks are uploaded
   - Handle errors and cancellations

4. **Add Concurrency Control**:
   - Limit the number of concurrent chunk uploads
   - Track progress across all chunks

#### 3.2. File Upload Component (`components/FileUpload.tsx`)

1. **Update Progress Tracking**:
   - Handle progress calculation for multipart uploads
   - Show overall progress across all chunks

2. **Add Chunk Status Display** (optional):
   - Show the status of individual chunks
   - Allow retrying failed chunks

### 4. Examples and Documentation

1. **Update README.md**:
   - Document multipart upload capabilities
   - Explain configuration options

2. **Create Example**:
   - Add an example showing how to use multipart uploads
   - Include configuration for different file size thresholds

## Implementation Steps

1. **Phase 1: Server-Side Implementation**
   - Implement the multipart upload functions in the MinIO client wrapper
   - Update the upload service to support multipart uploads
   - Add necessary types and interfaces

2. **Phase 2: Client-Side Implementation**
   - Add file size check and chunking logic
   - Implement multipart upload flow
   - Add concurrency control

3. **Phase 3: Testing and Optimization**
   - Test with various file sizes
   - Optimize chunk size and concurrency
   - Handle edge cases and errors

## Code Changes Required

### 1. MinIO Client Wrapper

The MinIO client already has multipart upload capabilities, but we need to expose them through our wrapper:

```typescript
// In packages/features/minio/actions/minioActions.ts

export async function initiateMultipartUpload(
  bucketName: string,
  objectName: string,
  options?: MultipartUploadOptions
): Promise<MultipartUploadInitResponse> {
  const client = getMinioClient();
  return await client.initiateMultipartUpload(bucketName, objectName, options);
}

export async function generatePresignedPartUrl(
  bucketName: string,
  objectName: string,
  params: {
    uploadId: string;
    partNumber: number;
    options?: PresignedPartUrlOptions;
  }
): Promise<PresignedPartUrlResponse> {
  const client = getMinioClient();
  return await client.generatePresignedPartUrl(bucketName, objectName, params);
}

export async function completeMultipartUpload(
  bucketName: string,
  objectName: string,
  options: {
    uploadId: string;
    parts: MultipartUploadPart[];
  }
): Promise<void> {
  const client = getMinioClient();
  await client.completeMultipartUpload(
    bucketName,
    objectName,
    options.uploadId,
    options.parts
  );
}

export async function abortMultipartUpload(
  bucketName: string,
  objectName: string,
  uploadId: string
): Promise<void> {
  const client = getMinioClient();
  await client.abortMultipartUpload(bucketName, objectName, uploadId);
}
```

### 2. Upload Service

```typescript
// In packages/features/file-upload/lib/upload-service.ts

export async function generateUploadTokens(
  config: UploadConfig,
  count = 1,
  options?: { forceMultipart?: boolean }
): Promise<GenerateTokensResponse> {
  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Ensure bucket exists
  // ... existing code ...

  // Generate tokens
  const tokens: UploadToken[] = [];
  const internalTokens: Array<{
    uploadUrl: string;
    formData: Record<string, string>;
    objectKey: string;
    bucketName: string;
    isMultipart?: boolean;
    uploadId?: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    // Generate a unique object key
    const uuid = randomUUID();
    const objectKey = config.folder ? `${config.folder}/${uuid}` : uuid;

    // Determine if this should be a multipart upload
    const isMultipart = options?.forceMultipart || false;

    if (!isMultipart) {
      // Simple upload - existing code
      // ... existing code ...
    } else {
      // Multipart upload
      const response = await client.initiateMultipartUpload(
        config.bucketName,
        objectKey,
        {
          contentType: config.allowedTypes.length === 1 ? config.allowedTypes[0] : undefined,
        }
      );

      // Add to tokens
      tokens.push({
        uploadUrl: "", // No direct upload URL for multipart
        formData: {}, // No form data for multipart
        isMultipart: true,
        uploadId: response.uploadId,
      });

      // Add to internal tokens
      internalTokens.push({
        uploadUrl: "",
        formData: {},
        objectKey,
        bucketName: config.bucketName,
        isMultipart: true,
        uploadId: response.uploadId,
      });
    }
  }

  // ... rest of the function ...
}

export async function generatePresignedPartUrl(
  identifier: string,
  partNumber: number,
  config: UploadConfig
): Promise<{ url: string; partNumber: number }> {
  // Get upload info from cache
  const uploadInfo = tokenCache.get(identifier);

  if (!uploadInfo) {
    throw new Error("Upload identifier not found");
  }

  // Verify config matches
  if (uploadInfo.config.bucketName !== config.bucketName) {
    throw new Error("Configuration mismatch");
  }

  // Find the token with multipart flag
  const token = uploadInfo.tokens.find(t => t.isMultipart);
  
  if (!token || !token.uploadId) {
    throw new Error("No multipart upload found");
  }

  // Create MinIO client
  const client = new MinioObjectStorageClient();

  // Generate presigned URL for the part
  const response = await client.generatePresignedPartUrl(
    token.bucketName,
    token.objectKey,
    {
      uploadId: token.uploadId,
      partNumber,
    }
  );

  return {
    url: response.url,
    partNumber: response.partNumber,
  };
}

export async function completeMultipartUpload(
  identifier: string,
  parts: MultipartUploadPart[],
  config: UploadConfig
): Promise<UploadActionResponse> {
  // ... similar implementation ...
}

export async function abortMultipartUpload(
  identifier: string,
  config: UploadConfig
): Promise<UploadActionResponse> {
  // ... similar implementation ...
}
```

### 3. Client-Side Hook

```typescript
// In packages/features/file-upload/hooks/useFileUpload.ts

const startUpload = useCallback(async () => {
  if (files.length === 0) {
    return;
  }

  try {
    setStatus("preparing");

    // Check if any files exceed the threshold for multipart upload
    const needsMultipart = files.some(
      file => file.file.size > MULTIPART_UPLOAD_THRESHOLD
    );

    // Generate upload tokens
    const { tokens, identifier } = await actions.generateUploadTokens(
      files.length,
      { forceMultipart: needsMultipart }
    );
    setUploadIdentifier(identifier);

    // Start uploading files
    setStatus("uploading");

    const uploadPromises = files.map((file, index) => {
      const token = tokens[index];
      updateFileStatus(index, "uploading");

      if (!token.isMultipart) {
        // Simple upload - existing code
        // ... existing code ...
      } else {
        // Multipart upload
        return uploadFileMultipart(file, index, token, identifier);
      }
    });

    // ... rest of the function ...
  } catch (error) {
    // ... existing error handling ...
  }
}, [/* dependencies */]);

// New function for multipart upload
const uploadFileMultipart = async (
  file: UploadFile,
  index: number,
  token: UploadToken,
  identifier: string
) => {
  // Split file into chunks
  const chunks = splitFileIntoChunks(file.file, MULTIPART_CHUNK_SIZE);
  
  // Track upload progress for each chunk
  const chunkProgress = new Array(chunks.length).fill(0);
  
  // Upload chunks with concurrency control
  const parts: MultipartUploadPart[] = [];
  
  // Create a queue of chunks to upload
  const chunkQueue = chunks.map((chunk, i) => ({
    chunk,
    partNumber: i + 1,
  }));
  
  // Process chunks with limited concurrency
  await processChunksWithConcurrency(
    chunkQueue,
    async ({ chunk, partNumber }) => {
      // Get presigned URL for this part
      const { url } = await actions.generatePresignedPartUrl(
        identifier,
        partNumber
      );
      
      // Upload the chunk
      const etag = await uploadChunk(url, chunk, (progress) => {
        // Update progress for this chunk
        chunkProgress[partNumber - 1] = progress;
        
        // Calculate overall progress
        const totalProgress = chunkProgress.reduce(
          (sum, p) => sum + p,
          0
        ) / chunks.length;
        
        updateFileProgress(index, totalProgress);
      });
      
      // Add part information
      parts.push({ partNumber, etag });
    },
    MAX_CONCURRENT_CHUNKS
  );
  
  // Complete multipart upload
  await actions.completeMultipartUpload(identifier, parts);
  
  updateFileStatus(index, "success");
};

// Helper function to split file into chunks
const splitFileIntoChunks = (file: File, chunkSize: number): Blob[] => {
  const chunks: Blob[] = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }
  
  return chunks;
};

// Helper function to upload a single chunk
const uploadChunk = (
  url: string,
  chunk: Blob,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
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
};

// Helper function to process chunks with concurrency control
const processChunksWithConcurrency = async (
  items: Array<{ chunk: Blob; partNumber: number }>,
  processor: (item: { chunk: Blob; partNumber: number }) => Promise<void>,
  concurrency: number
) => {
  const queue = [...items];
  const inProgress = new Set();
  
  return new Promise<void>((resolve, reject) => {
    const processNext = async () => {
      if (queue.length === 0 && inProgress.size === 0) {
        resolve();
        return;
      }
      
      while (queue.length > 0 && inProgress.size < concurrency) {
        const item = queue.shift()!;
        inProgress.add(item);
        
        processor(item)
          .then(() => {
            inProgress.delete(item);
            processNext();
          })
          .catch((error) => {
            reject(error);
          });
      }
    };
    
    processNext();
  });
};
```

## Benefits of Multipart Upload

1. **Handle Larger Files**: Upload files that exceed server-side size limits
2. **Improved Reliability**: If a chunk fails, only that chunk needs to be retried
3. **Better Progress Tracking**: More accurate progress information
4. **Resume Capability**: Potential to resume interrupted uploads
5. **Parallel Uploads**: Upload multiple chunks concurrently for better performance

## Conclusion

Implementing multipart uploads will significantly improve the file upload feature's reliability and capability to handle large files. The implementation requires changes to both server-side and client-side code, but the MinIO client already provides the necessary functionality to support multipart uploads.

This document outlines the key changes needed, but the actual implementation may require additional adjustments based on the specific requirements and constraints of the project.
