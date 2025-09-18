# MinioClient Technical Documentation

## Overview

The `MinioClient` class is a comprehensive wrapper for the MinIO JavaScript client library, providing an abstraction layer for interacting with MinIO object storage services. It facilitates operations such as bucket management, presigned URL generation, notification configuration, and multipart uploads within the caimel-stack ecosystem.

## Core Functionality

### Initialization & Configuration

The client initializes with configurable MinIO connection parameters (endpoint, access key, secret key), defaulting to environment variables if not explicitly provided. It creates a connection to the MinIO server and provides detailed logging for troubleshooting connection issues.

### Bucket Operations

- **Bucket Existence Checking**: Verifies if a specified bucket exists in the MinIO storage
- **Bucket Creation**: Creates new buckets with optional region specification
- **Bucket Deletion**: Removes buckets, with an optional "force" parameter to recursively delete all contained objects first

### Object Operations

#### Presigned URL Generation

Generates secure, time-limited URLs for uploading objects to MinIO buckets without requiring direct authentication. The implementation:

- Automatically creates buckets if they don't exist
- Configures URL expiration (defaults to 1 hour)
- Sets content type restrictions when specified
- Enforces file size limits (defaults to 1GB)
- Returns both the URL and the required form fields for client-side uploads

#### Multipart Upload Support

Provides a complete API for handling large file uploads through multipart operations:

1. **Initiation**: Creates a new multipart upload session and returns an upload ID
2. **Part Upload URL Generation**: Creates presigned URLs for uploading individual file chunks
3. **Upload Completion**: Finalizes the multipart upload by assembling all parts
4. **Upload Abortion**: Cancels in-progress multipart uploads and cleans up resources
5. **Parts Listing**: Interface for tracking uploaded parts (note: actual tracking is delegated to an external database)

### Event Notification System

Implements a comprehensive notification system for bucket events:

- **Notification Configuration**: Sets up webhook notifications for bucket events (object creation, deletion, etc.)
- **Notification Verification**: Checks if notifications are already configured for a bucket
- **Notification Removal**: Clears notification configurations from buckets

## Technical Implementation Details

### Error Handling

Implements robust error handling throughout all operations with:

- Detailed error logging with contextual information
- Error propagation with meaningful messages
- Graceful fallbacks where appropriate (e.g., creating buckets when they don't exist)

### Default Configurations

Utilizes sensible defaults for common operations:

- Presigned URL expiration: 3600 seconds (1 hour)
- Maximum file size: 1GB
- Event notifications: "s3:ObjectCreated:\*" (triggers on all object creation events)

### Security Features

- Implements secure presigned URL generation with policy-based restrictions
- Supports content type validation
- Enforces file size limits
- Uses authentication tokens for webhook notifications

### Integration Points

- Integrates with environment configuration for connection parameters
- Supports webhook notifications for event-driven architectures
- Designed for integration with external tracking systems for multipart uploads

## Use Cases

1. **Direct File Uploads**: Generate secure URLs for client-side file uploads without exposing MinIO credentials
2. **Large File Handling**: Support for uploading large files through multipart upload APIs
3. **Event-Driven Processing**: Configure notifications to trigger processing workflows when objects are created or modified
4. **Bucket Management**: Programmatically create, verify, and delete storage buckets

## Technical Considerations

- The client includes extensive logging for debugging and troubleshooting
- Implements promise-based APIs for asynchronous operations
- Handles edge cases such as non-existent buckets and connection errors
- Provides type safety through TypeScript interfaces for all operations
