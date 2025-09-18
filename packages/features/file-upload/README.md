# File Upload Feature

This feature provides a complete solution for file uploads in Next.js applications using MinIO as the storage backend.

## Key Components

### Server-Side

1. **Upload Service (`lib/upload-service.ts`)**
   - Core functionality for generating upload tokens, finalizing uploads, and canceling uploads
   - Handles bucket creation and notification setup automatically
   - Uses a token cache to track uploads

2. **Types (`types/index.ts`)**
   - `UploadConfig`: Configuration for file uploads (bucketName, folder, allowedTypes, maxSizeMB)
   - `UploadToken`: Upload token for a single file (uploadUrl, formData)
   - `GenerateTokensResponse`: Response from generating upload tokens (tokens, identifier)
   - `UploadActionResponse`: Response from finalizing or canceling uploads (success, message)

3. **Configuration (`config/index.ts`)**
   - Default webhook configuration from environment variables

4. **Server Actions Example (`examples/betterMockFileUploadAction.ts`)**
   - Example implementation of server actions for file uploads
   - Demonstrates how to wrap the upload service functions

### Client-Side

1. **FileUpload Component (`components/FileUpload.tsx`)**
   - React component for file uploads with drag-and-drop support
   - Handles file validation, progress tracking, and error handling
   - Provides a complete UI for file uploads

2. **useFileUpload Hook (`hooks/useFileUpload.ts`)**
   - React hook for managing file uploads
   - Handles the upload workflow, progress tracking, and error handling
   - Can be used independently of the FileUpload component

## Usage

### 1. Create Server Actions

Create server actions that wrap the upload service functions:

```typescript
"use server";

import { generateUploadTokens, finalizeUpload, cancelUpload } from "@features/file-upload";

// Configuration constants
const UPLOAD_CONFIG = {
  bucketName: "my-bucket",
  folder: "uploads",
  allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
  maxSizeMB: 10, // 10MB max file size
};

export async function generateUploadTokensAction(count = 1) {
  return await generateUploadTokens(UPLOAD_CONFIG, count);
}

export async function finalizeUploadAction(identifier: string) {
  return await finalizeUpload(identifier, UPLOAD_CONFIG);
}

export async function cancelUploadAction(identifier: string) {
  return await cancelUpload(identifier, UPLOAD_CONFIG);
}
```

### 2. Use the FileUpload Component

Use the FileUpload component in your React components:

```tsx
"use client";

import { FileUpload } from "@features/file-upload";
import {
  generateUploadTokensAction,
  finalizeUploadAction,
  cancelUploadAction,
} from "./actions";

export function MyUploadForm() {
  return (
    <div>
      <h1>Upload Files</h1>
      <FileUpload
        actions={{
          generateUploadTokens: generateUploadTokensAction,
          finalizeUpload: finalizeUploadAction,
          cancelUpload: cancelUploadAction,
        }}
        maxFiles={5}
        maxSizeMB={10}
        allowedTypes={["image/jpeg", "image/png", "application/pdf"]}
        onComplete={(files) => {
          console.log("Upload completed:", files);
        }}
        onError={(error) => {
          console.error("Upload error:", error);
        }}
      />
    </div>
  );
}
```

### 3. Or Use the useFileUpload Hook

For more control, you can use the useFileUpload hook directly:

```tsx
"use client";

import { useFileUpload } from "@features/file-upload";
import {
  generateUploadTokensAction,
  finalizeUploadAction,
  cancelUploadAction,
} from "./actions";

export function MyCustomUploadForm() {
  const {
    files,
    status,
    addFiles,
    removeFile,
    startUpload,
    cancelUpload,
    reset,
    isUploading,
  } = useFileUpload({
    generateUploadTokens: generateUploadTokensAction,
    finalizeUpload: finalizeUploadAction,
    cancelUpload: cancelUploadAction,
  });

  // Implement your custom UI...
}
```

## Environment Variables

The feature uses the following environment variables for webhook configuration:

```
MINIO_WEBHOOK_ENDPOINT=https://api.example.com/webhooks/file-upload
MINIO_WEBHOOK_AUTH_TOKEN=your-auth-token
```

These are optional and only needed if you want to receive notifications when files are uploaded.
