# File Upload System Relationships

## Core Entities

### Upload Session
- **Purpose**: Tracks the lifecycle of a file upload from pre-signed URL generation to completion
- **Database Model**: `UploadSession`
- **Key Fields**:
  - `id`: Unique identifier
  - `userId`: Optional link to a user (nullable)
  - `objectKey`: Unique identifier for the file in MinIO storage
  - `uploadId`: Optional identifier for multipart uploads
  - `status`: Current status of the upload (enum `FileStatus`)
  - `uploadedAt`: When the upload completed
  - `createdAt`: When the upload session was created
  - `updatedAt`: When the upload session was last updated

### Processing Job
- **Purpose**: Represents a task to be performed on an uploaded file
- **Database Model**: `ProcessingJob`
- **Key Fields**:
  - `id`: Unique identifier
  - `sessionId`: Link to the parent upload session
  - `type`: Type of job (enum `JobType`)
  - `status`: Current status of the job (enum `JobStatus`)
  - `priority`: Processing priority (1-10, lower is higher priority)
  - `config`: Job-specific configuration
  - `result`: Job results
  - `error`: Error message if failed
  - `attempts`: Number of attempts made
  - `maxAttempts`: Maximum allowed attempts

## Entity Relationship Overview

```
+-------+       +---------------+       +---------------+
|       |       |               |       |               |
| User  |-------| UploadSession |-------| ProcessingJob |
|       |       |               |       |               |
+-------+       +---------------+       +---------------+
    |                   |                      |
    |                   |                      |
    v                   v                      v
 Optional         Maps to one file      Performs specific
relationship     in MinIO storage       operations on file
(nullable)                              (validation, etc.)
```

### Key Relationships

- **User to UploadSession**: Optional one-to-many relationship
  - A user can initiate multiple upload sessions
  - An upload session may exist without a user (anonymous uploads)
  - When a user is associated, it provides tracking and permissions

- **UploadSession to File**: One-to-one relationship
  - Each upload session corresponds to exactly one file in storage
  - The file is identified by its `objectKey` in MinIO
  - The session tracks the complete lifecycle of this single file

- **UploadSession to ProcessingJob**: One-to-many relationship
  - A single uploaded file can undergo multiple processing operations
  - Each processing job has a specific purpose (validation, transformation, etc.)
  - Jobs are executed based on priority and can be run in parallel

### Data Flow

1. User (optional) initiates an upload session
2. System generates pre-signed URL(s) for the file
3. File is uploaded to MinIO storage
4. Processing jobs are created for the uploaded file
5. Jobs execute and update the file's metadata and status

## Relationships

1. **User → Upload Sessions**: One-to-many
   - One user can have multiple upload sessions
   - Upload sessions can optionally belong to a user (nullable)

2. **Upload Session → Processing Jobs**: One-to-many
   - One upload session can have multiple processing jobs
   - Each processing job belongs to exactly one upload session

## Upload Flow

1. **Pre-signed URL Generation**:
   - Client requests a pre-signed URL via `generateFileUploadUrl`
   - System validates request (file type, size)
   - System creates an `UploadSession` record with status `PENDING_UPLOAD`
   - System returns pre-signed URL and session ID to client

2. **File Upload**:
   - Client uploads file directly to MinIO using the pre-signed URL
   - MinIO sends webhook notification when upload completes
   - System updates the `UploadSession` status to `UPLOADED`

3. **Processing**:
   - System creates `ProcessingJob` records for the uploaded file
   - Background workers process the jobs
   - Each job updates its status as it progresses

## Multipart Upload Support

The system has schema definitions for multipart uploads but the implementation appears to be incomplete:

- `multipartUploadInitSchema`: For initializing multipart uploads
- `multipartUploadCompleteSchema`: For completing multipart uploads
- `multipartUploadAbortSchema`: For aborting multipart uploads

When implemented, multipart uploads would allow:
- Breaking large files into smaller chunks
- Uploading chunks in parallel
- Resuming interrupted uploads

## File Status Lifecycle

```
PENDING_UPLOAD → UPLOADING → UPLOADED → PROCESSING → COMPLETED
                                      ↘ FAILED
                                      ↘ DELETED
```

## Job Status Lifecycle

```
PENDING → RUNNING → COMPLETED
                  ↘ FAILED
                  ↘ CANCELLED
```

## Clarifications on Your Questions

1. **"A file-upload session must be initiated by first pre-signed URL"**:
   - Yes, correct. The upload session is created when generating the pre-signed URL.
   - This establishes tracking before the actual upload begins.

2. **"A upload session is related to 1 user. 1 user can have multiple download sessions"**:
   - Yes, the database schema shows a one-to-many relationship between users and upload sessions.
   - A user can have multiple upload sessions, but each upload session belongs to at most one user.

3. **"With multi-file-uploads, then additional pre-signed URLs are required"**:
   - Partially correct. The current implementation creates one upload session per file.
   - There's no built-in concept of grouping multiple files into a single logical upload session.
   - Each file gets its own pre-signed URL and database record.

4. **"Then a upload session can contain 1-n files"**:
   - Not in the current implementation. Each upload session is for a single file (objectKey).
   - To implement multi-file uploads, you would need to create a parent entity to group related upload sessions.

5. **"These files have a progress themselves"**:
   - Yes, each file (upload session) has a status that tracks its progress.
   - The status transitions from PENDING_UPLOAD through various states to COMPLETED or FAILED.

6. **"For one file, 1-n pre-signed URLs can be used (as it can have multiple parts)"**:
   - This would be true for multipart uploads, but the implementation appears incomplete.
   - The schema supports multipart uploads, but the actual implementation is not visible in the code reviewed.
   - When implemented, a single file could be uploaded in multiple parts, each with its own pre-signed URL.

## Enhanced Data Model for Multi-File and Chunked Uploads

The following enhanced data model addresses the limitations in the current implementation by supporting multi-file uploads and chunked uploads for large files.

### New Core Entity: Upload Group

- **Purpose**: Groups related upload sessions together as a single logical upload
- **Database Model**: `UploadGroup`
- **Key Fields**:
  - `id`: Unique identifier
  - `name`: Display name for the group
  - `description`: Optional description
  - `userId`: Optional link to a user (nullable)
  - `status`: Current status of the group (enum `GroupStatus`)
  - `totalFiles`: Total number of files in the group
  - `completedFiles`: Number of completed files
  - `createdAt`: When the group was created
  - `updatedAt`: When the group was last updated

### Enhanced Upload Session

- **Purpose**: Tracks the lifecycle of a file upload, now with support for multipart uploads
- **Database Model**: `UploadSession` (enhanced)
- **Key Fields**:
  - `id`: Unique identifier
  - `groupId`: Optional link to parent upload group (nullable)
  - `userId`: Optional link to a user (nullable)
  - `objectKey`: Unique identifier for the file in MinIO storage
  - `uploadId`: Optional identifier for multipart uploads
  - `status`: Current status of the upload (enum `FileStatus`)
  - `uploadedAt`: When the upload completed
  - `createdAt`: When the upload session was created
  - `updatedAt`: When the upload session was last updated
  - `totalParts`: Total number of parts for multipart uploads
  - `completedParts`: Number of completed parts

### New Core Entity: File Part

- **Purpose**: Represents a part of a file in a multipart upload
- **Database Model**: `FilePart`
- **Key Fields**:
  - `id`: Unique identifier
  - `sessionId`: Link to the parent upload session
  - `partNumber`: Part number in the multipart upload
  - `etag`: Entity tag returned by MinIO after part upload
  - `size`: Size of the part in bytes
  - `status`: Current status of the part (enum `PartStatus`)
  - `uploadedAt`: When the part was uploaded

### Enhanced Relationships

```
+-------+       +---------------+       +---------------+       +---------------+
|       |       |               |       |               |       |               |
| User  |-------| UploadGroup   |-------| UploadSession |-------| FilePart     |
|       |       |               |       |               |       |               |
+-------+       +---------------+       +---------------+       +---------------+
                       |                       |                       |
                       |                       |                       |
                       v                       v                       v
                 Groups related        Maps to one file        Represents a chunk
                upload sessions      in MinIO storage          of a large file
                                                                    |
                                                                    |
                                                                    v
                                                          +---------------+
                                                          |               |
                                                          | ProcessingJob |
                                                          |               |
                                                          +---------------+
```

### Key Relationships

1. **User → Upload Groups**: One-to-many
   - One user can have multiple upload groups
   - Upload groups can optionally belong to a user (nullable)

2. **Upload Group → Upload Sessions**: One-to-many
   - One upload group can contain multiple upload sessions (files)
   - Each upload session can optionally belong to an upload group

3. **Upload Session → File Parts**: One-to-many
   - One upload session can have multiple file parts (for chunked uploads)
   - Each file part belongs to exactly one upload session

4. **Upload Session → Processing Jobs**: One-to-many
   - One upload session can have multiple processing jobs
   - Each processing job belongs to exactly one upload session

### Enhanced Status Lifecycles

#### Group Status Lifecycle

```
PENDING → IN_PROGRESS → COMPLETED
                      ↘ FAILED
                      ↘ CANCELLED
```

#### Part Status Lifecycle

```
PENDING → UPLOADING → UPLOADED
                    ↘ FAILED
```
