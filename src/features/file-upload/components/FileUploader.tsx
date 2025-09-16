"use client";

import {
  AlertCircle,
  CheckCircle,
  File,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Progress,
} from "@/features/shadcn/index.client";
import {
  type FileUploadProgress,
  useFileUploadManager,
} from "../hooks/useFileUpload";
import type {
  FileType,
  FileUploadConfig,
  FileUploadResponse,
  UploadedFile,
} from "../types";

export interface FileUploaderProps {
  getFileUploadUrl: (
    fileName: string,
    fileType: string,
    fileSize: number
  ) => Promise<FileUploadResponse>;
  config?: Partial<FileUploadConfig>;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (
    progress: Record<string, number>,
    speeds: Record<string, number>
  ) => void;
  onUploadStart?: () => void;
  multiple?: boolean;
  className?: string;
  buttonText?: string;
  dropzoneText?: string;
  showProgressDetails?: boolean;
  maxFiles?: number;
}

interface FileUploadState {
  file: File;
  status: "pending" | "uploading" | "completed" | "error";
  progress: FileUploadProgress;
  error?: string;
  result?: UploadedFile;
}

export function FileUploader({
  getFileUploadUrl,
  config,
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  onUploadStart,
  multiple = false,
  className = "",
  buttonText = "Select Files",
  dropzoneText = "or drop files here",
  showProgressDetails = true,
  maxFiles = 5,
}: FileUploaderProps) {
  const [fileStates, setFileStates] = useState<Record<string, FileUploadState>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [completedFiles, setCompletedFiles] = useState<UploadedFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const { executeFileUpload, cancelFileUpload, cancelAllFileUploads } =
    useFileUploadManager(getFileUploadUrl);

  // Get current files from state
  const currentFiles = Object.values(fileStates).map((state) => state.file);
  const pendingFiles = Object.values(fileStates).filter(
    (state) => state.status === "pending"
  );
  const uploadingFiles = Object.values(fileStates).filter(
    (state) => state.status === "uploading"
  );
  const completedUploads = Object.values(fileStates).filter(
    (state) => state.status === "completed"
  );
  const failedUploads = Object.values(fileStates).filter(
    (state) => state.status === "error"
  );

  // Validate file before adding
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (
        config?.allowedFileTypes &&
        !config.allowedFileTypes.includes(file.type as FileType)
      ) {
        return `File type not allowed. Allowed types: ${config.allowedFileTypes.join(", ")}`;
      }

      // Check file size
      if (config?.maxFileSize && file.size > config.maxFileSize) {
        return `File size exceeds the maximum allowed size of ${Math.round(config.maxFileSize / (1024 * 1024))}MB`;
      }

      return null;
    },
    [config]
  );

  // Handle file selection
  const handleFileChange = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles);
      setGlobalError(null);

      // Check if multiple files are allowed
      if (!multiple && newFiles.length > 1) {
        setGlobalError("Only one file can be uploaded at a time");
        return;
      }

      // Check max files limit
      const totalFiles = multiple
        ? currentFiles.length + newFiles.length
        : newFiles.length;
      if (totalFiles > maxFiles) {
        setGlobalError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate and add files
      const newFileStates: Record<string, FileUploadState> = {};

      for (const file of newFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          setGlobalError(validationError);
          continue;
        }

        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

        // Check for duplicates
        if (fileStates[fileKey]) {
          setGlobalError(`File "${file.name}" is already selected`);
          continue;
        }

        newFileStates[fileKey] = {
          file,
          status: "pending",
          progress: { loaded: 0, total: file.size, percentage: 0, speed: 0 },
        };
      }

      // Update state
      if (Object.keys(newFileStates).length > 0) {
        if (multiple) {
          setFileStates((prev) => ({ ...prev, ...newFileStates }));
        } else {
          setFileStates(newFileStates);
          setCompletedFiles([]);
        }
      }
    },
    [currentFiles.length, multiple, maxFiles, validateFile, fileStates]
  );

  // Remove file
  const removeFile = useCallback(
    (fileKey: string) => {
      const fileState = fileStates[fileKey];
      if (fileState?.status === "uploading") {
        cancelFileUpload(fileState.file.name);
      }

      setFileStates((prev) => {
        const newState = { ...prev };
        delete newState[fileKey];
        return newState;
      });
    },
    [fileStates, cancelFileUpload]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.add("border-primary");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("border-primary");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneRef.current?.classList.remove("border-primary");
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  // Upload all files
  const uploadFiles = useCallback(async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setGlobalError(null);
    const uploadResults: UploadedFile[] = [];

    // Notify parent component that upload has started
    onUploadStart?.();

    try {
      // Upload files concurrently with reasonable limit
      const maxConcurrent = Math.min(3, pendingFiles.length);
      const semaphore = new Array(maxConcurrent).fill(null);
      let fileIndex = 0;

      await Promise.all(
        semaphore.map(async () => {
          while (fileIndex < pendingFiles.length) {
            const fileState = pendingFiles[fileIndex++];
            const fileKey = `${fileState.file.name}-${fileState.file.size}-${fileState.file.lastModified}`;

            try {
              // Update status to uploading
              setFileStates((prev) => ({
                ...prev,
                [fileKey]: { ...prev[fileKey], status: "uploading" },
              }));

              const result = await executeFileUpload(fileState.file, config, {
                onProgress: (progress) => {
                  setFileStates((prev) => ({
                    ...prev,
                    [fileKey]: { ...prev[fileKey], progress },
                  }));
                },
                onComplete: (uploadedFile) => {
                  setFileStates((prev) => ({
                    ...prev,
                    [fileKey]: {
                      ...prev[fileKey],
                      status: "completed",
                      result: uploadedFile,
                    },
                  }));
                  uploadResults.push(uploadedFile);
                },
                onError: (error) => {
                  setFileStates((prev) => ({
                    ...prev,
                    [fileKey]: {
                      ...prev[fileKey],
                      status: "error",
                      error: error.message,
                    },
                  }));
                },
              });

              console.log(
                `[CUSTOM_UPLOADER] Successfully uploaded: ${result.name}`
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown upload error";
              console.error(
                `[CUSTOM_UPLOADER] Upload failed for ${fileState.file.name}:`,
                error
              );

              setFileStates((prev) => ({
                ...prev,
                [fileKey]: {
                  ...prev[fileKey],
                  status: "error",
                  error: errorMessage,
                },
              }));
            }
          }
        })
      );

      // Update completed files and notify parent
      if (uploadResults.length > 0) {
        setCompletedFiles((prev) => [...prev, ...uploadResults]);
        onUploadComplete?.(uploadResults);
      }

      // Check if any uploads failed
      const failedCount = Object.values(fileStates).filter(
        (state) => state.status === "error"
      ).length;
      if (failedCount > 0 && uploadResults.length === 0) {
        setGlobalError(
          "All uploads failed. Please check individual file errors."
        );
        onUploadError?.("All uploads failed");
      } else if (failedCount > 0) {
        setGlobalError(
          `${failedCount} file(s) failed to upload. Successful uploads: ${uploadResults.length}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown upload error";
      setGlobalError(`Upload process failed: ${errorMessage}`);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [
    pendingFiles,
    config,
    onUploadStart,
    onUploadComplete,
    onUploadError,
    executeFileUpload,
    fileStates,
  ]);

  // Cancel all uploads
  const cancelUploads = useCallback(() => {
    cancelAllFileUploads();
    setIsUploading(false);

    // Reset uploading files to pending
    setFileStates((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (newState[key].status === "uploading") {
          newState[key] = { ...newState[key], status: "pending" };
        }
      });
      return newState;
    });
  }, [cancelAllFileUploads]);

  // Notify parent of progress updates
  useEffect(() => {
    if (isUploading && onUploadProgress) {
      const progress: Record<string, number> = {};
      const speeds: Record<string, number> = {};

      Object.entries(fileStates).forEach(([key, state]) => {
        progress[state.file.name] = state.progress.percentage;
        speeds[state.file.name] = state.progress.speed;
      });

      onUploadProgress(progress, speeds);
    }
  }, [fileStates, isUploading, onUploadProgress]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  // Format upload speed
  const formatSpeed = (kbps: number): string => {
    if (kbps === 0) return "";
    if (kbps < 1024) return `${Math.round(kbps)} KB/s`;
    return `${(kbps / 1024).toFixed(1)} MB/s`;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Dropzone */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50"
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={dropzoneRef}
      >
        <Upload className="mb-2 h-10 w-10 text-gray-400" />
        <p className="font-medium text-sm">{buttonText}</p>
        <p className="mt-1 text-gray-500 text-xs">{dropzoneText}</p>
        <p className="mt-1 text-gray-400 text-xs">
          Using custom server action for secure uploads
        </p>
        <input
          accept={config?.allowedFileTypes?.join(",")}
          className="hidden"
          multiple={multiple}
          onChange={(e) => handleFileChange(e.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {/* Global error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* File list */}
      {currentFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              Files ({currentFiles.length}/{maxFiles})
            </h3>
            {isUploading && (
              <Button onClick={cancelUploads} size="sm" variant="outline">
                Cancel All
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {Object.entries(fileStates).map(([fileKey, fileState]) => (
              <div className="rounded-lg border p-3" key={fileKey}>
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 flex-1 items-start space-x-3">
                    <div className="mt-1 flex-shrink-0">
                      {fileState.status === "completed" && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {fileState.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {fileState.status === "uploading" && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {fileState.status === "pending" && (
                        <File className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="truncate font-medium text-sm">
                          {fileState.file.name}
                        </p>
                        {showProgressDetails && (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                            Secure
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {formatFileSize(fileState.file.size)}
                        {fileState.status === "uploading" &&
                          fileState.progress.speed > 0 && (
                            <span className="ml-2">
                              • {formatSpeed(fileState.progress.speed)}
                            </span>
                          )}
                      </p>

                      {/* Progress bar */}
                      {fileState.status === "uploading" && (
                        <div className="mt-2">
                          <Progress
                            className="h-2"
                            value={fileState.progress.percentage}
                          />
                          <p className="mt-1 text-right text-xs">
                            {fileState.progress.percentage}%
                          </p>
                        </div>
                      )}

                      {/* Error message */}
                      {fileState.status === "error" && fileState.error && (
                        <p className="mt-1 text-red-500 text-xs">
                          {fileState.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  {fileState.status !== "uploading" && (
                    <Button
                      className="flex-shrink-0"
                      onClick={() => removeFile(fileKey)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed files */}
      {completedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-green-700 text-sm">
            Successfully Uploaded ({completedFiles.length})
          </h3>
          <div className="space-y-1">
            {completedFiles.map((file, index) => (
              <div
                className="flex items-center space-x-2 text-green-600 text-xs"
                key={`completed-${index}`}
              >
                <CheckCircle className="h-3 w-3" />
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {pendingFiles.length > 0 && (
        <Button className="mt-2" disabled={isUploading} onClick={uploadFiles}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {uploadingFiles.length} files...
            </>
          ) : (
            `Upload ${pendingFiles.length} file${pendingFiles.length === 1 ? "" : "s"}`
          )}
        </Button>
      )}
    </div>
  );
}
