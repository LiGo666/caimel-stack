# File Upload Feature

A feature for handling file uploads using pre-signed URLs with MinIO storage. This feature provides both components and hooks for easy integration into your application.

## Features

- Upload files using pre-signed URLs
- Progress tracking for uploads
- Configurable file type restrictions
- File size limits
- Multiple file upload support
- Drag and drop interface
- Custom folder and bucket configuration

## Usage

### Component Approach

Use the `FileUploader` component for a complete UI solution:

```tsx
import { FileUploader } from "@features/file-upload";

function MyComponent() {
  const handleUploadComplete = (files) => {
    console.log("Files uploaded:", files);
  };

  const handleUploadError = (error) => {
    console.error("Upload error:", error);
  };

  return (
    <FileUploader
      config={{
        allowedFileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        bucketName: "my-bucket",
        uploadFolder: "user-uploads",
      }}
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      multiple={true}
    />
  );
}
```

### Hook Approach

Use the `useFileUpload` hook for more control over the UI:

```tsx
import { useFileUpload } from "@features/file-upload";

function MyCustomUploader() {
  const {
    uploadFile,
    uploadFiles,
    uploading,
    progress,
    uploadedFiles,
    error,
    reset
  } = useFileUpload({
    config: {
      allowedFileTypes: ["image/jpeg", "image/png"],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      bucketName: "images",
      uploadFolder: "profile-pictures",
    },
    onUploadComplete: (files) => {
      console.log("Upload complete:", files);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const handleFileChange = async (e) => {
    if (e.target.files?.length) {
      await uploadFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {uploading && <p>Uploading: {progress[Object.keys(progress)[0]]}%</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `allowedFileTypes` | `string[]` | Array of MIME types allowed for upload |
| `maxFileSize` | `number` | Maximum file size in bytes |
| `maxFiles` | `number` | Maximum number of files that can be uploaded at once |
| `uploadFolder` | `string` | Folder path within the bucket |
| `bucketName` | `string` | Name of the MinIO bucket |

## Server Actions

The feature provides several server actions:

- `getPresignedUrl`: Generate a pre-signed URL for file upload
- `getFileUrl`: Get a download URL for a file
- `deleteFile`: Delete a file from storage
- `listFiles`: List files in a bucket/folder

## Dependencies

This feature depends on the `minio` feature for storage operations.

## MinIO Integration

The file-upload feature uses the minio feature to handle storage operations. This separation allows for:

1. Better encapsulation of storage-specific code
2. Easier switching to other storage providers in the future (e.g., AWS S3)
3. Reuse of MinIO functionality across different features

### Dual Endpoint Configuration

The file-upload feature leverages the minio feature's dual endpoint configuration:

- **Internal Endpoint**: Used by the server to communicate with MinIO (e.g., `minio:9000`)
- **Public Endpoint**: Used in generated pre-signed URLs for client access (e.g., `upload-3afb6505.christiangotthardt.de`)

This configuration is automatically handled by the minio feature, which transforms URLs in pre-signed links to use the public endpoint. This ensures that:

1. Server-side operations use the efficient internal Docker network
2. Client-side uploads go to the publicly accessible endpoint

For more details on the dual endpoint configuration, see the minio feature documentation.
