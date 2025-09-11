# File Upload Feature Analysis

## Overview

The `file-upload` feature is a comprehensive file upload system that provides secure file uploading to MinIO storage using presigned URLs. It supports both direct uploads and chunked uploads (though chunked upload is currently disabled in the custom strategy), with extensive client-side validation and progress tracking.

## Directory Structure & Components

### Barrel Exports

- **`index.ts`** (Server-only): Exports server-side utilities
   - Exports: `generatePresignedUrl`, `FileUploadConfig` type
   - Purpose: Server-side entry point for generating presigned URLs
- **`index.client.ts`** (Client-only): Exports client-side components and types
   - Exports: `FileUploader` component, `UploadedFile` type
   - Purpose: Client-side entry point for UI components

### Actions (`/actions/`)

- **`upload.ts`**
   - Function: `getFileUrl(bucketName, objectKey, expiryInSeconds)`
   - Purpose: Server action to generate download URLs for uploaded files
   - Usage: Called by upload strategy to get downloadable URLs after upload

### Components (`/components/`)

- **`FileUploader.tsx`** (426 lines)
   - Main React component for file uploading
   - Features:
      - Drag & drop interface with visual feedback
      - File validation (type, size, duplicates)
      - Multi-file support with configurable limits
      - Real-time upload progress with speed tracking
      - Upload cancellation and retry capabilities
      - Custom presigned URL integration via props
   - Props: Accepts custom `getPresignedUrl` function, configuration overrides, event callbacks
   - State Management: Complex local state for file tracking, progress, errors

### Configuration (`/config/`)

- **`upload-config.ts`**
   - `defaultConfig`: Default upload configuration object
   - `createUploadConfig()`: Helper to merge custom config with defaults
   - Default settings: 5MB max, common file types, single file uploads

### Hooks (`/hooks/`)

- **`useUploadStrategy.ts`** (198 lines)
   - Custom hook: `useCustomUploadStrategy(customGetPresignedUrl)`
   - Functions:
      - `uploadDirect()`: Direct file upload using XMLHttpRequest with progress tracking
      - `uploadChunked()`: Placeholder (currently throws error - not implemented for custom actions)
      - `uploadFile()`: Smart upload method selector (currently only uses direct)
      - `abortUpload()` / `abortAllUploads()`: Upload cancellation
   - Features: Progress tracking, speed calculation, abort controller management

### Library (`/lib/`)

- **`presigned-url.ts`** (69 lines)
   - Function: `generatePresignedUrl(request, customConfig?)`
   - Purpose: Server-side presigned URL generation with full validation
   - Features:
      - Request validation using Zod schemas
      - File type and size validation
      - Bucket name validation (S3 compliance)
      - MinIO client integration
      - Automatic bucket creation

- **`manageLifecycle.ts`** (148 lines)
   - Classes: `UploadSessionRepository`, `ProcessingJobRepository`
   - Purpose: Database operations for upload sessions and background jobs
   - Features:
      - Upload session lifecycle management
      - Processing job queue management
      - Statistics and cleanup operations
      - Webhook integration support

### Schema (`/schema/`)

- **`upload.schema.ts`** (72 lines)
   - Zod schemas for validation:
      - `fileUploadRequestSchema`: Basic upload request validation
      - `fileUploadConfigSchema`: Configuration validation
      - `multipartUploadInitSchema`: Multipart upload initialization
      - `multipartUploadCompleteSchema`: Multipart completion validation
      - `multipartUploadAbortSchema`: Multipart abort validation

### Types (`/types/`)

- **`index.ts`** (134 lines)
   - Core types:
      - `FileType`: Supported MIME types
      - `FileUploadConfig`: Upload configuration interface
      - `PresignedUrlResponse`: Presigned URL structure
      - `FileUploadRequest/Response`: Request/response interfaces
      - `UploadedFile`: Final uploaded file representation
      - Multipart upload types (currently unused)
      - MinIO webhook event types

- **`database.ts`** (36 lines)
   - Database-related types:
      - Re-exports Prisma enums: `FileStatus`, `JobStatus`, `JobType`
      - Extended types: `UploadSession`, `ProcessingJob`
      - Helper interfaces: `CreateUploadSessionData`, `CreateJobData`
      - Utility: `parseObjectKey()` function

## Usage Analysis

### In Admin Test Page (`/src/app/admin/protected/test/fileupload/`)

**`page.tsx`** - Test implementation showing real-world usage:

- Imports `FileUploader` from client barrel
- Uses custom server action `exampleGetPresignedUrl` for presigned URL generation
- Demonstrates configuration override (300MB limit, audio files only)
- Implements all callback handlers (progress, complete, error, start)
- Shows progress tracking UI with speeds and file details

**`(actions)/getPresignedUrl.ts`** - Custom server action:

- Wraps the feature's `generatePresignedUrl` function
- Applies custom configuration (bucket: "uploads-wow", folder: "sexyshit666")
- Demonstrates how to customize upload settings per use case

### Integration Pattern

The feature follows a clean separation of concerns:

1. **Server Action**: Custom action calls feature's `generatePresignedUrl`
2. **Client Component**: `FileUploader` receives the custom action as prop
3. **Configuration**: Server-side config overrides client-side validation
4. **Upload Flow**: Client → Server Action → MinIO → Progress Updates → Completion

## Naming Improvement Proposals

### Strategy 1: Domain-Driven Naming

**Focus**: Align names with business domain and user mental models

**File Renaming**:

- `FileUploader.tsx` → `SecureFileDropzone.tsx` (emphasizes security and drag-drop UX)
- `useUploadStrategy.ts` → `useSecureUpload.ts` (simpler, emphasizes security)
- `presigned-url.ts` → `secure-upload-generator.ts` (more descriptive of purpose)
- `manageLifecycle.ts` → `upload-session-manager.ts` (clearer responsibility)
- `upload-config.ts` → `upload-constraints.ts` (better describes validation rules)


### Strategy 2: Action-Oriented Naming

**Focus**: Emphasize what each component does rather than what it is

**File Renaming**:

- `FileUploader.tsx` → `UploadFiles.tsx` (action verb)
- `useUploadStrategy.ts` → `useFileTransfer.ts` (emphasizes data movement)
- `presigned-url.ts` → `authorize-upload.ts` (emphasizes security action)
- `manageLifecycle.ts` → `track-uploads.ts` (emphasizes monitoring)
- `upload.ts` (actions) → `retrieve-file.ts` (clearer about the action)

**Function Renaming**:

- `generatePresignedUrl` → `authorizeFileUpload`
- `getFileUrl` → `retrieveFileAccess`
- `uploadFile` → `transferFile`
- `handleUploadComplete` → `processUploadSuccess`

### Strategy 3: Hierarchical Clarity Naming

**Focus**: Create clear hierarchies and relationships between components

**File Renaming**:

- `FileUploader.tsx` → `FileUpload.Component.tsx`
- `useUploadStrategy.ts` → `FileUpload.Hook.tsx`
- `presigned-url.ts` → `FileUpload.Authorization.ts`
- `manageLifecycle.ts` → `FileUpload.SessionManager.ts`
- `upload-config.ts` → `FileUpload.Configuration.ts`

**Function Renaming**:

- `generatePresignedUrl` → `FileUpload.authorize`
- `uploadDirect` → `FileUpload.transferDirect`
- `abortUpload` → `FileUpload.cancelTransfer`
- `validateFile` → `FileUpload.validateConstraints`

**Barrel Export Reorganization**:

```typescript
// index.ts - Server exports
export * as FileUploadServer from "./server"
export * as FileUploadAuthorization from "./authorization"

// index.client.ts - Client exports
export * as FileUploadComponents from "./components"
export * as FileUploadHooks from "./hooks"
```

## Recommendations

1. **Strategy 1 (Domain-Driven)** is recommended for user-facing components as it better communicates the security and business value
2. **Strategy 2 (Action-Oriented)** works well for internal APIs and hooks where the action is more important than the abstraction
3. **Strategy 3 (Hierarchical)** could be implemented gradually and would work well for a larger file management system

The current naming is already quite good, but **Strategy 1** would provide the most immediate value by emphasizing the secure, enterprise-grade nature of the upload system.
