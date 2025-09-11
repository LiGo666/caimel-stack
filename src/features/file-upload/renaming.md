# File Upload Feature Renaming Guide

## Overview

This document provides a comprehensive renaming strategy for all files and functions in the file-upload feature, based on consistent naming conventions that emphasize the file upload domain.

## File Renaming

### Current → New File Names

| Current File           | New File                         | Rationale                                         |
| ---------------------- | -------------------------------- | ------------------------------------------------- |
| `FileUploader.tsx`     | `FileUploader.tsx`               | ✅ **Keep as is** - Already clear and descriptive |
| `useUploadStrategy.ts` | `useFileUpload.ts`               | Simpler, more direct naming                       |
| `presigned-url.ts`     | `file-upload-generator.ts`       | More descriptive of purpose                       |
| `manageLifecycle.ts`   | `file-upload-session-manager.ts` | Clearer responsibility                            |
| `upload-config.ts`     | `file-upload-config.ts`          | Consistent with feature naming                    |
| `upload.ts` (actions)  | `file-retrieval.ts`              | More descriptive of actual purpose                |

## Function Renaming by File

### `/actions/upload.ts` → `/actions/file-retrieval.ts`

| Current Function | New Function              | Description                                  |
| ---------------- | ------------------------- | -------------------------------------------- |
| `getFileUrl`     | `generateFileDownloadUrl` | More descriptive of generating download URLs |

### `/components/FileUploader.tsx` (Component stays same name)

**Main Component:** | Current Function | New Function | Description | |-----------------|-------------|-------------| | `FileUploader` | `FileUploader` | ✅ **Keep as is** - Component name stays |

**Internal Component Functions:** | Current Function | New Function | Description | |-----------------|-------------|-------------| | `validateFile` | `validateFileUploadConstraints` | More specific about what validation does | | `handleFileChange` | `handleFileSelection` | Clearer about the action | | `removeFile` | `removeFileFromUpload` | More specific context | | `handleDragOver` | `handleFileUploadDragOver` | Context-specific naming | | `handleDragLeave` | `handleFileUploadDragLeave` | Context-specific naming | | `handleDrop` | `handleFileUploadDrop` | Context-specific naming | | `uploadFiles` | `initiateFileUpload` | More descriptive of action | | `cancelUploads` | `cancelAllFileUploads` | More explicit | | `formatFileSize` | `formatFileUploadSize` | Context-specific | | `formatSpeed` | `formatFileUploadSpeed` | Context-specific |

### `/config/upload-config.ts` → `/config/file-upload-config.ts`

| Current Function     | New Function             | Description                   |
| -------------------- | ------------------------ | ----------------------------- |
| `createUploadConfig` | `createFileUploadConfig` | Consistent with domain naming |

### `/hooks/useUploadStrategy.ts` → `/hooks/useFileUpload.ts`

**Main Hook:** | Current Function | New Function | Description | |-----------------|-------------|-------------| | `useCustomUploadStrategy` | `useFileUploadManager` | Clearer purpose, matches user preference |

**Hook Methods:** | Current Function | New Function | Description | |-----------------|-------------|-------------| | `uploadDirect` | `performDirectFileUpload` | Matches user preference | | `uploadChunked` | `performChunkedFileUpload` | Consistent with direct upload naming | | `uploadFile` | `executeFileUpload` | More action-oriented | | `abortUpload` | `cancelFileUpload` | Clearer action | | `abortAllUploads` | `cancelAllFileUploads` | Consistent with single cancel |

### `/lib/presigned-url.ts` → `/lib/file-upload-generator.ts`

| Current Function       | New Function            | Description             |
| ---------------------- | ----------------------- | ----------------------- |
| `generatePresignedUrl` | `generateFileUploadUrl` | Matches user preference |

### `/lib/manageLifecycle.ts` → `/lib/file-upload-session-manager.ts`

**UploadSessionRepository Class:** | Current Method | New Method | Description | |----------------|------------|-------------| | `create` | `createFileUploadSession` | More descriptive | | `findByObjectKey` | `findFileUploadSessionByKey` | Clearer purpose | | `findById` | `findFileUploadSessionById` | Consistent naming | | `updateStatus` | `updateFileUploadSessionStatus` | More explicit | | `updateStatusByObjectKey` | `updateFileUploadSessionStatusByKey` | Consistent with find method | | `addJob` | `addFileProcessingJob` | More descriptive | | `findByUserId` | `findFileUploadSessionsByUser` | Clearer about returning multiple | | `findByStatus` | `findFileUploadSessionsByStatus` | Consistent naming | | `cleanupOldSessions` | `cleanupOldFileUploadSessions` | More explicit |

**ProcessingJobRepository Class:** | Current Method | New Method | Description | |----------------|------------|-------------| | `getNextJobs` | `getNextFileProcessingJobs` | More specific | | `markAsRunning` | `markFileProcessingJobAsRunning` | Context-specific | | `markAsCompleted` | `markFileProcessingJobAsCompleted` | Context-specific | | `markAsFailed` | `markFileProcessingJobAsFailed` | Context-specific | | `findByTypeAndStatus` | `findFileProcessingJobsByTypeAndStatus` | More explicit | | `getStats` | `getFileProcessingJobStats` | Context-specific |

### `/types/database.ts` (File name stays same)

| Current Function | New Function               | Description              |
| ---------------- | -------------------------- | ------------------------ |
| `parseObjectKey` | `parseFileUploadObjectKey` | More specific to context |

## Prop/Parameter Renaming

### FileUploader Component Props

| Current Prop            | New Prop               | Description             |
| ----------------------- | ---------------------- | ----------------------- |
| `customGetPresignedUrl` | `getFileUploadUrl`     | Matches user preference |
| `onUploadComplete`      | `onFileUploadComplete` | More explicit           |
| `onUploadError`         | `onFileUploadError`    | More explicit           |
| `onUploadProgress`      | `onFileUploadProgress` | More explicit           |
| `onUploadStart`         | `onFileUploadStart`    | More explicit           |

## Constants and Types Renaming

### Configuration Constants

| Current         | New                       | Description   |
| --------------- | ------------------------- | ------------- |
| `defaultConfig` | `defaultFileUploadConfig` | More explicit |

### Type Names (if needed)

| Current             | New                   | Description                      |
| ------------------- | --------------------- | -------------------------------- |
| `FileUploadState`   | `FileUploadState`     | ✅ **Keep as is** - Already good |
| `UploadProgress`    | `FileUploadProgress`  | More specific                    |
| `UploadCallbacks`   | `FileUploadCallbacks` | More specific                    |
| `GetPresignedUrlFn` | `GetFileUploadUrlFn`  | Consistent with function naming  |

## Implementation Priority

### Phase 1: Core Functions (High Impact)

1. `generatePresignedUrl` → `generateFileUploadUrl`
2. `useCustomUploadStrategy` → `useFileUploadManager`
3. `uploadDirect` → `performDirectFileUpload`
4. `customGetPresignedUrl` prop → `getFileUploadUrl`

### Phase 2: File Renames

1. `useUploadStrategy.ts` → `useFileUpload.ts`
2. `presigned-url.ts` → `file-upload-generator.ts`
3. `upload-config.ts` → `file-upload-config.ts`
4. `manageLifecycle.ts` → `file-upload-session-manager.ts`
5. `upload.ts` → `file-retrieval.ts`

### Phase 3: Internal Functions

1. Repository method renames
2. Internal component function renames
3. Type and interface updates

## Naming Conventions Applied

1. **Domain Prefix**: All functions use "fileUpload" or "file" prefix for clarity
2. **Action Verbs**: Use specific action verbs (generate, perform, execute, create, find, etc.)
3. **Context Specificity**: Functions are named to show their specific purpose within file upload
4. **Consistency**: Similar functions across different files follow the same naming pattern
5. **Clarity**: Names clearly indicate what the function does and in what context

## Benefits of This Renaming

1. **Improved Searchability**: Easy to find all file-upload related functions
2. **Clear Context**: Function names immediately indicate their domain
3. **Consistency**: Similar patterns across the entire feature
4. **Maintainability**: Easier for new developers to understand the codebase
5. **API Clarity**: Public API functions have clear, descriptive names
