"use client";

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/features/shadcn/components/ui/badge";
import { Button } from "@/features/shadcn/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shadcn/components/ui/card";
import { Progress } from "@/features/shadcn/components/ui/progress";
import { cn } from "@/features/shadcn/lib/utils";
import {
  type GroupUploadProgress,
  useEnhancedFileUploadManager,
} from "../hooks/useEnhancedFileUpload";
import type { UploadedFile } from "../types";

export interface EnhancedFileUploaderProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  allowMultiple?: boolean;
  className?: string;
}

interface FileWithProgress {
  file: File;
  status: "pending" | "uploading" | "completed" | "error";
  progress?: number;
  speed?: number;
  error?: string;
  uploadedFile?: UploadedFile;
}

export function EnhancedFileUploader({
  onFilesUploaded,
  onError,
  maxFiles = 10,
  maxFileSize = 5000 * 1024 * 1024, // 5GB
  acceptedFileTypes = [
    "audio/mpeg",
    "application/zip",
    "image/jpeg",
    "image/png",
    "video/mp4",
    "application/pdf",
  ],
  allowMultiple = true,
  className,
}: EnhancedFileUploaderProps) {
  const [filesWithProgress, setFilesWithProgress] = useState<
    FileWithProgress[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<GroupUploadProgress>({});
  const completedFiles = useRef<UploadedFile[]>([]);

  const { uploadMultipleFiles, cancelFileUpload, cancelAllUploads } =
    useEnhancedFileUploadManager();

  // File validation
  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return `File "${file.name}" is too large. Maximum size is ${Math.round(maxFileSize / (1024 * 1024))}MB.`;
      }

      if (
        acceptedFileTypes.length > 0 &&
        !acceptedFileTypes.includes(file.type)
      ) {
        return `File "${file.name}" type is not supported. Accepted types: ${acceptedFileTypes.join(", ")}`;
      }

      return null;
    },
    [maxFileSize, acceptedFileTypes]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileWithProgress[] = [];
      const errors: string[] = [];

      // Check max files limit
      if (filesWithProgress.length + acceptedFiles.length > maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      for (const file of acceptedFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        // Check for duplicates
        const isDuplicate = filesWithProgress.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        );
        if (isDuplicate) {
          errors.push(`File "${file.name}" is already selected`);
          continue;
        }

        newFiles.push({
          file,
          status: "pending",
        });
      }

      if (errors.length > 0) {
        onError?.(errors.join("; "));
      }

      if (newFiles.length > 0) {
        setFilesWithProgress((prev) => [...prev, ...newFiles]);
      }
    },
    [filesWithProgress, maxFiles, validateFile, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: allowMultiple,
    accept:
      acceptedFileTypes.length > 0
        ? acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {})
        : undefined,
    disabled: isUploading,
  });

  const startUpload = useCallback(async () => {
    if (filesWithProgress.length === 0) return;

    setIsUploading(true);
    completedFiles.current = [];

    // Update all files to uploading status
    setFilesWithProgress((prev) =>
      prev.map((f) => ({
        ...f,
        status: f.status === "pending" ? ("uploading" as const) : f.status,
      }))
    );

    const filesToUpload = filesWithProgress
      .filter((f) => f.status === "uploading")
      .map((f) => f.file);

    try {
      await uploadMultipleFiles(filesToUpload, undefined, {
        onGroupProgress: (progress) => {
          setUploadProgress(progress);
        },
        onFileProgress: (fileName, progress) => {
          setFilesWithProgress((prev) =>
            prev.map((f) =>
              f.file.name === fileName
                ? { ...f, progress: progress.percentage, speed: progress.speed }
                : f
            )
          );
        },
        onFileComplete: (fileName, uploadedFile) => {
          completedFiles.current.push(uploadedFile);
          setFilesWithProgress((prev) =>
            prev.map((f) =>
              f.file.name === fileName
                ? { ...f, status: "completed", progress: 100, uploadedFile }
                : f
            )
          );
        },
        onFileError: (fileName, error) => {
          setFilesWithProgress((prev) =>
            prev.map((f) =>
              f.file.name === fileName ? { ...f, status: "error", error } : f
            )
          );
        },
        onGroupComplete: (files) => {
          setIsUploading(false);
          onFilesUploaded?.(files);
        },
        onGroupError: (error) => {
          setIsUploading(false);
          onError?.(error);
        },
      });
    } catch (error) {
      setIsUploading(false);
      onError?.(error instanceof Error ? error.message : "Upload failed");
    }
  }, [filesWithProgress, uploadMultipleFiles, onFilesUploaded, onError]);

  const removeFile = useCallback(
    (fileName: string) => {
      if (isUploading) {
        cancelFileUpload(fileName);
      }
      setFilesWithProgress((prev) =>
        prev.filter((f) => f.file.name !== fileName)
      );
    },
    [isUploading, cancelFileUpload]
  );

  const clearAll = useCallback(() => {
    if (isUploading) {
      cancelAllUploads();
      setIsUploading(false);
    }
    setFilesWithProgress([]);
    setUploadProgress({});
    completedFiles.current = [];
  }, [isUploading, cancelAllUploads]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return "0 KB/s";
    return `${Math.round(bytesPerSecond)} KB/s`;
  };

  const getUploadMethod = (fileSize: number): string => {
    return fileSize > 100 * 1024 * 1024 ? "Multipart" : "Direct";
  };

  const pendingFiles = filesWithProgress.filter((f) => f.status === "pending");
  const completedCount = filesWithProgress.filter(
    (f) => f.status === "completed"
  ).length;
  const errorCount = filesWithProgress.filter(
    (f) => f.status === "error"
  ).length;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Drop Zone */}
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400",
            isUploading && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          {isDragActive ? (
            <p className="text-primary">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600">
                Drag & drop files here, or click to select
              </p>
              <p className="mt-1 text-gray-400 text-sm">
                Max {maxFiles} files, up to{" "}
                {Math.round(maxFileSize / (1024 * 1024))}MB each
              </p>
              <p className="text-gray-400 text-sm">
                Supports:{" "}
                {acceptedFileTypes
                  .slice(0, 3)
                  .map((type) => type.split("/")[1])
                  .join(", ")}
                {acceptedFileTypes.length > 3 &&
                  ` +${acceptedFileTypes.length - 3} more`}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* File List */}
      {filesWithProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Selected Files ({filesWithProgress.length})
                </CardTitle>
                <CardDescription>
                  {completedCount > 0 && `${completedCount} completed`}
                  {errorCount > 0 && `, ${errorCount} failed`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {pendingFiles.length > 0 && (
                  <Button disabled={isUploading} onClick={startUpload}>
                    {isUploading
                      ? "Uploading..."
                      : `Upload ${pendingFiles.length} files`}
                  </Button>
                )}
                <Button
                  disabled={isUploading}
                  onClick={clearAll}
                  variant="outline"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filesWithProgress.map((fileInfo) => (
              <div
                className="flex items-center gap-3 rounded-lg border p-3"
                key={`${fileInfo.file.name}-${fileInfo.file.size}`}
              >
                <FileText className="h-6 w-6 flex-shrink-0 text-gray-400" />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="truncate font-medium">{fileInfo.file.name}</p>
                    <Badge className="text-xs" variant="outline">
                      {getUploadMethod(fileInfo.file.size)}
                    </Badge>
                    {fileInfo.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {fileInfo.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-gray-500 text-sm">
                    <span>{formatFileSize(fileInfo.file.size)}</span>
                    <span>{fileInfo.file.type}</span>
                    {fileInfo.speed && fileInfo.speed > 0 && (
                      <span>{formatSpeed(fileInfo.speed)}</span>
                    )}
                  </div>

                  {fileInfo.status === "uploading" &&
                    typeof fileInfo.progress === "number" && (
                      <div className="mt-2">
                        <Progress className="h-2" value={fileInfo.progress} />
                        <div className="mt-1 flex justify-between text-gray-500 text-xs">
                          <span>{fileInfo.progress}%</span>
                          {fileInfo.speed && (
                            <span>{formatSpeed(fileInfo.speed)}</span>
                          )}
                        </div>
                      </div>
                    )}

                  {fileInfo.status === "error" && (
                    <p className="mt-1 text-red-500 text-sm">
                      {fileInfo.error}
                    </p>
                  )}
                </div>

                <Button
                  disabled={isUploading && fileInfo.status === "uploading"}
                  onClick={() => removeFile(fileInfo.file.name)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
