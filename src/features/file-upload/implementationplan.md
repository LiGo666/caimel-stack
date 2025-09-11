# File Upload Implementation Plan

## Current System Analysis

The current file upload system has the following limitations:

1. **No Multi-Part Upload Support**: The `performChunkedFileUpload` function in `useFileUpload.ts` is a placeholder that throws an error.
2. **One File Per Upload Session**: Each file gets its own upload session, with no concept of grouping related files.
3. **No Parent Entity**: There's no way to track multiple files as part of a single logical upload.
4. **Limited Progress Tracking**: Progress is tracked per file, but not for a group of files.

## Implementation Goals

1. Create a simple upload dropzone/button that transparently handles:
   - Single file uploads
   - Multi-file uploads
   - Chunked uploads for large files

2. Update the data model to support:
   - File upload sessions with multiple files
   - Tracking of file parts for chunked uploads
   - Comprehensive lifecycle tracking

3. Implement a FileUploadManager Dashboard to:
   - Monitor upload sessions
   - Track progress of individual files and their parts
   - Manage file processing jobs

## Data Model Changes

### New Entity: `UploadGroup`

```typescript
// A group of related upload sessions
interface UploadGroup {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  status: GroupStatus;
  totalFiles: number;
  completedFiles: number;
  createdAt: Date;
  updatedAt: Date;
  sessions: UploadSession[];
}

enum GroupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

### Updated Entity: `UploadSession`

```typescript
// Modified to include groupId and support for parts
interface UploadSession {
  id: string;
  groupId?: string;  // Link to parent UploadGroup
  userId?: string;
  objectKey: string;
  uploadId?: string;  // For multipart uploads
  status: FileStatus;
  uploadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalParts?: number;  // For multipart uploads
  completedParts?: number;  // For multipart uploads
  parts?: FilePart[];  // For multipart uploads
  jobs: ProcessingJob[];
}
```

### New Entity: `FilePart`

```typescript
// Represents a part of a file in a multipart upload
interface FilePart {
  id: string;
  sessionId: string;
  partNumber: number;
  etag?: string;
  size: number;
  status: PartStatus;
  uploadedAt?: Date;
}

enum PartStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED'
}
```

## Implementation Steps

### 1. Database Schema Updates

1. Create Prisma schema for new `UploadGroup` entity
2. Update `UploadSession` schema to include group relationship and part tracking
3. Create schema for `FilePart` entity
4. Update relationships between entities

### 2. Backend API Implementation

1. Enhance MinioClient to support multipart uploads:
   - `initiateMultipartUpload`
   - `generatePartUploadUrl`
   - `completeMultipartUpload`
   - `abortMultipartUpload`

2. Update repositories:
   - Create `UploadGroupRepository`
   - Enhance `UploadSessionRepository` to support parts
   - Create `FilePartRepository`

3. Update server actions :
   - Enhance `generateFileUploadUrl` to support multipart uploads:
   - Add `initiateMultipartUpload` feature
   - Add `generatePartUploadUrl` feature
   - Add `completeMultipartUpload` feature
   - Add `abortMultipartUpload` feature
   The features must made available through one server-action like in src/app/admin/protected/test/fileupload/(actions)/generateFileUploadUrlAction.ts. This becomes the main session controller that uses the features from file-upload-session-manager.ts in combination with src/app/api/minio-webhook/route.ts to handle the upload process in the database model, managed and observed by the FileUploadManager.Via SSE the FileUploadManager notifies the client about the progress of the upload process and the availability of the uploade file(s) and possible job-processing finalizations of those, so they can be further processed. The whole upload-initialization -> upload -> finalization -> job-processing -> finalization is a transactional process becomes lean to implement and robust to work

4. Update webhook handler to process multipart upload events

### 3. Frontend Implementation

1. Enhance `useFileUploadManager` hook:
   - Implement chunked upload logic
   - Add support for upload groups
   - Add automatic file size detection for upload method selection

2. Update `FileUploader` component:
   - Add support for upload groups
   - Implement transparent upload method selection
   - Enhance progress tracking for multiple files and parts

3. Create `FileUploadManager` dashboard component:
   - List upload groups
   - Show detailed view of files within a group
   - Display part-level details for chunked uploads
   - Provide actions (retry, cancel, delete)

### 4. Testing

1. Unit tests for new and updated repositories
2. Integration tests for multipart upload flow
3. End-to-end tests for the complete upload process
4. Performance testing with large files

## Success Criteria

1. Users can upload files of any size without manual intervention
2. Large files are automatically chunked for reliable uploads
3. Upload progress is accurately tracked at file and part levels
4. Failed uploads can be easily identified and retried
5. The system scales efficiently with many concurrent uploads
