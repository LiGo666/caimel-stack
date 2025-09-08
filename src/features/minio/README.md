# MinIO Feature

A feature for interacting with MinIO object storage. This feature provides a client for basic MinIO operations and is used by the file-upload feature for storage operations.

## Features

- MinIO client for object storage operations
- Pre-signed URL generation for secure uploads
- Bucket management
- Object listing and management
- Environment-based configuration

## Usage

### Basic Usage

```typescript
import { MinioClient } from "@features/minio";

// Create a MinIO client with default configuration from environment variables
const minioClient = new MinioClient();

// Or with custom configuration including separate public endpoint
const customClient = new MinioClient({
  endpoint: "minio", // Internal endpoint for server-side operations
  publicEndpoint: "minio.example.com", // Public endpoint for generated URLs
  port: 9000,
  accessKey: "your-access-key",
  secretKey: "your-secret-key",
  useSSL: true,
});

// Check if a bucket exists
const bucketExists = await minioClient.bucketExists("my-bucket");

// Create a bucket if it doesn't exist
if (!bucketExists) {
  await minioClient.createBucket({ name: "my-bucket" });
}
```

### Generating Pre-signed URLs

```typescript
// Generate a pre-signed URL for uploading a file
const presignedUrl = await minioClient.generatePresignedUrl({
  bucketName: "my-bucket",
  objectName: "uploads/my-file.jpg",
  expiry: 3600, // 1 hour
  contentType: "image/jpeg",
});

// Get a pre-signed URL for downloading a file
const downloadUrl = await minioClient.getPresignedObjectUrl(
  "my-bucket",
  "uploads/my-file.jpg",
  3600 // 1 hour
);
```

### Listing and Managing Objects

```typescript
// List objects in a bucket
const objects = await minioClient.listObjects({
  bucketName: "my-bucket",
  prefix: "uploads/",
  recursive: true,
});

// Remove an object
await minioClient.removeObject("my-bucket", "uploads/my-file.jpg");
```

## Configuration

The MinIO client is configured using environment variables:

- `MINIO_ENDPOINT`: The internal MinIO server endpoint (e.g., `minio` for container-to-container communication)
- `MINIO_PUBLIC_ENDPOINT`: The public-facing MinIO endpoint (e.g., `upload-3afb6505.christiangotthardt.de`)
- `MINIO_PORT`: The port MinIO is running on (default: 9000)
- `MINIO_ACCESS_KEY`: The access key for authentication
- `MINIO_SECRET_KEY`: The secret key for authentication

These variables are validated through the env feature.

### Dual Endpoint Configuration

The MinIO feature supports separate internal and public endpoints:

- **Internal Endpoint**: Used for server-side operations like bucket management and object operations
- **Public Endpoint**: Used for generating pre-signed URLs that will be accessible from the client

This dual configuration is particularly useful in containerized environments where:

1. Server-side code needs to access MinIO via the internal Docker network (e.g., `minio:9000`)
2. Client-side code needs URLs that point to the public-facing endpoint (e.g., `http://upload-3afb6505.christiangotthardt.de`)

The MinIO client automatically handles URL transformations, replacing the internal endpoint with the public endpoint in generated URLs.

## API Reference

### MinioClient

The main class for interacting with MinIO.

#### Methods

- `bucketExists(bucketName: string): Promise<boolean>`
- `createBucket(bucketConfig: BucketConfig): Promise<boolean>`
- `generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResult>`
- `getPresignedObjectUrl(bucketName: string, objectName: string, expiry?: number): Promise<string>`
- `listObjects(options: ListObjectsOptions): Promise<ObjectInfo[]>`
- `removeObject(bucketName: string, objectName: string): Promise<boolean>`

### Types

- `MinioConfig`: Configuration for the MinIO client
- `BucketConfig`: Configuration for bucket creation
- `PresignedUrlOptions`: Options for generating pre-signed URLs
- `PresignedUrlResult`: Result of generating a pre-signed URL
- `ObjectInfo`: Information about an object in MinIO
- `ListObjectsOptions`: Options for listing objects

## Integration with file-upload Feature

The minio feature is used by the file-upload feature to handle storage operations. This separation allows the file-upload feature to focus on UI and user experience while delegating storage operations to the minio feature.
