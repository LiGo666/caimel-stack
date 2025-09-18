/** biome-ignore-all lint/nursery/useSortedClasses: <explanation> */
/** biome-ignore-all assist/source/useSortedAttributes: <explanation> */
"use client";

import { Alert, AlertDescription } from "@features/shadcn/components/ui/alert";
import { Button } from "@features/shadcn/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@features/shadcn/components/ui/card";
import { Progress } from "@features/shadcn/components/ui/progress";
import { cn } from "@features/shadcn/lib/utils";
import { useCallback, useRef, useState } from "react";

import type { FileUploadActions, UploadFile } from "../hooks/useFileUpload";
import { useFileUpload } from "../hooks/useFileUpload";

export type FileUploadProps = {
  /**
   * Actions for handling file uploads
   */
  actions: FileUploadActions;

  /**
   * Maximum number of files allowed
   * @default Infinity
   */
  maxFiles?: number;

  /**
   * Maximum file size in MB
   * @default 50
   */
  maxSizeMB?: number;

  /**
   * Allowed file types (MIME types)
   * @default [] (all types)
   */
  allowedTypes?: string[];

  /**
   * Whether to allow multiple files
   * @default true
   */
  multiple?: boolean;

  /**
   * Function to call when all uploads are complete
   */
  onComplete?: (files: UploadFile[]) => void;

  /**
   * Function to call when an error occurs
   */
  onError?: (error: Error, files?: UploadFile[]) => void;

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Custom class name for the dropzone
   */
  dropzoneClassName?: string;

  /**
   * Custom class name for the file list
   */
  fileListClassName?: string;

  /**
   * Custom class name for the button
   */
  buttonClassName?: string;

  /**
   * Custom class name for the progress bar
   */
  progressClassName?: string;
};

// Constants to avoid magic numbers
const MAX_ERROR_KEY_LENGTH = 20;
const DEFAULT_MAX_SIZE_MB = 50;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

export function FileUpload({
  actions,
  maxFiles = Number.POSITIVE_INFINITY,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  allowedTypes = [],
  multiple = true,
  onComplete,
  onError,
  className = "",
  dropzoneClassName = "",
  fileListClassName = "",
  buttonClassName = "",
  progressClassName = "",
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    status,
    addFiles,
    removeFile,
    startUpload,
    cancelUpload,
    reset,
    isUploading,
  } = useFileUpload(actions, {
    onComplete,
    onError,
  });

  /**
   * Validate a single file
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxSizeMB * BYTES_PER_MB) {
        return {
          valid: false,
          error: `File "${file.name}" exceeds the maximum size of ${maxSizeMB}MB.`,
        };
      }

      // Check file type if allowedTypes is specified
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File "${file.name}" has an unsupported type. Allowed types: ${allowedTypes.join(", ")}.`,
        };
      }

      // File passed validation
      return { valid: true };
    },
    [maxSizeMB, allowedTypes]
  );

  /**
   * Check if adding files would exceed max count
   */
  const checkMaxFilesLimit = useCallback(
    (count: number): { valid: boolean; error?: string } => {
      if (files.length + count > maxFiles) {
        return {
          valid: false,
          error: `You can only upload a maximum of ${maxFiles} files.`,
        };
      }
      return { valid: true };
    },
    [files.length, maxFiles]
  );

  /**
   * Process validation results and handle errors
   */
  const handleValidationResults = useCallback(
    (validFiles: File[], errors: string[]) => {
      // Show errors if any
      if (errors.length > 0) {
        // biome-ignore lint/suspicious/noConsole: Development code
        console.error("Validation errors:", errors);
        setValidationErrors(errors);
        return false;
      }

      // Add valid files
      if (validFiles.length > 0) {
        addFiles(validFiles);
        return true;
      }

      return false;
    },
    [addFiles]
  );

  /**
   * Validate files before adding them
   */
  const validateAndAddFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) {
        return;
      }

      // Convert FileList to array
      const filesArray = Array.from(fileList);

      // Check max files limit
      const maxFilesCheck = checkMaxFilesLimit(filesArray.length);
      if (!maxFilesCheck.valid && maxFilesCheck.error) {
        setValidationErrors([maxFilesCheck.error]);
        return;
      }

      // Validate each file
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of filesArray) {
        const result = validateFile(file);
        if (result.valid) {
          validFiles.push(file);
        } else if (result.error) {
          errors.push(result.error);
        }
      }

      // Process results
      handleValidationResults(validFiles, errors);
    },
    [checkMaxFilesLimit, validateFile, handleValidationResults]
  );

  /**
   * Handle file input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndAddFiles(e.target.files);
      // Reset input value so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [validateAndAddFiles]
  );

  // Drag and drop handlers are now inline in the button element

  /**
   * Handle button click
   */
  const handleButtonClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < BYTES_PER_KB) {
      return `${bytes} B`;
    }

    if (bytes < BYTES_PER_MB) {
      return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
    }

    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
  }, []);

  return (
    <Card className={cn("w-full", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        onChange={handleChange}
        accept={allowedTypes.join(",")}
        className="hidden"
      />

      <CardContent className="p-6">
        {/* Dropzone */}
        <button
          type="button"
          className={cn(
            "border-2",
            "border-dashed",
            "h-auto",
            "hover:bg-muted/50",
            "p-8",
            "text-center",
            "w-full",
            dragActive ? "bg-muted" : "bg-transparent",
            dropzoneClassName
          )}
          onClick={handleButtonClick}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            validateAndAddFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="mb-2 text-base">
              Drag and drop files here, or click to select files
            </p>
            {allowedTypes.length > 0 && (
              <p className="mb-1 text-xs text-muted-foreground">
                Allowed types: {allowedTypes.join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum size: {maxSizeMB}MB
            </p>
          </div>
        </button>

        {/* File list */}
        {files.length > 0 && (
          <div className={cn("mt-4", fileListClassName)}>
            <h3 className="mb-2 text-lg font-medium">Files ({files.length})</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.file.name}-${index}`}
                  className="border-b flex items-center justify-between p-2"
                >
                  <div>
                    <div className="font-medium">{file.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.file.size)} • {file.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Progress bar */}
                    {file.status === "uploading" && (
                      <div className={cn("w-24", progressClassName)}>
                        <Progress value={file.progress} className="h-2" />
                      </div>
                    )}

                    {/* Remove button */}
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              <p>Please fix the following errors:</p>
              <ul className="mt-2 list-disc pl-5">
                {validationErrors.map((error) => (
                  <li
                    key={`error-${error.replace(/\s+/g, "-").toLowerCase().slice(0, MAX_ERROR_KEY_LENGTH)}`}
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Status messages */}
        {status === "success" && (
          <Alert className="mt-4 border-green-500 text-green-500">
            <AlertDescription>Upload completed successfully!</AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              An error occurred during upload.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="flex gap-2 border-t bg-muted/50 p-4">
        {!isUploading && files.length > 0 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className={cn(buttonClassName)}
            onClick={startUpload}
          >
            Upload Files
          </Button>
        )}

        {isUploading && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className={cn(buttonClassName)}
            onClick={cancelUpload}
          >
            Cancel Upload
          </Button>
        )}

        {files.length > 0 && !isUploading && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={cn(buttonClassName)}
            onClick={reset}
          >
            Clear All
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
