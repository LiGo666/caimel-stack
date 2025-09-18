/** biome-ignore-all lint/suspicious/noConsole: Testing TODO:remove! */
"use client";

import { useCallback, useState } from "react";
import type { GenerateTokensResponse, UploadActionResponse } from "../types";

export type FileUploadActions = {
  /**
   * Generate upload tokens for files
   */
  generateUploadTokens: (count?: number) => Promise<GenerateTokensResponse>;

  /**
   * Finalize an upload after it's complete
   */
  finalizeUpload: (identifier: string) => Promise<UploadActionResponse>;

  /**
   * Cancel an upload if there's an error
   */
  cancelUpload: (identifier: string) => Promise<UploadActionResponse>;
};

export type UploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "success"
  | "error";

export type UploadFile = {
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
};

export type UseFileUploadOptions = {
  /**
   * Function to call when all uploads are complete
   */
  onComplete?: (files: UploadFile[]) => void;

  /**
   * Function to call when an error occurs
   */
  onError?: (error: Error, files?: UploadFile[]) => void;
};

export function useFileUpload(
  actions: FileUploadActions,
  options: UseFileUploadOptions = {}
) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadIdentifier, setUploadIdentifier] = useState<string | null>(null);

  const { onComplete, onError } = options;

  /**
   * Reset the upload state
   */
  const reset = useCallback(() => {
    setFiles([]);
    setStatus("idle");
    setUploadIdentifier(null);
  }, []);

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prevFiles) => [
      ...prevFiles,
      ...newFiles.map((file) => ({
        file,
        progress: 0,
        status: "idle" as UploadStatus,
      })),
    ]);
  }, []);

  /**
   * Remove a file from the upload queue
   */
  const removeFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  /**
   * Update a file's progress
   */
  const updateFileProgress = useCallback((index: number, progress: number) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) => (i === index ? { ...file, progress } : file))
    );
  }, []);

  /**
   * Update a file's status
   */
  const updateFileStatus = useCallback(
    (index: number, fileStatus: UploadStatus, error?: string) => {
      setFiles((prevFiles) =>
        prevFiles.map((file, i) =>
          i === index ? { ...file, status: fileStatus, error } : file
        )
      );
    },
    []
  );

  /**
   * Start the upload process
   */
  const startUpload = useCallback(async () => {
    if (files.length === 0) {
      return;
    }

    try {
      setStatus("preparing");

      // Generate upload tokens
      const { tokens, identifier } = await actions.generateUploadTokens(
        files.length
      );
      setUploadIdentifier(identifier);
      
      // Log the tokens for debugging
      console.log("Upload tokens:", tokens);

      // Start uploading files
      setStatus("uploading");

      const uploadPromises = files.map((file, index) => {
        const token = tokens[index];
        updateFileStatus(index, "uploading");

        // For this example, we'll use simple upload for all files
        // In a real implementation, you would implement multipart upload for large files

        // Create form data
        const formData = new FormData();

        // Add all required form fields from token.formData
        for (const [key, value] of Object.entries(token.formData)) {
          formData.append(key, value);
        }

        // Add the file
        formData.append("file", file.file);

        // Upload the file with progress tracking
        return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              // biome-ignore lint/style/noMagicNumbers: calculated value
              const progress = Math.round((event.loaded / event.total) * 100);
              updateFileProgress(index, progress);
            }
          });

          xhr.addEventListener("load", () => {
            const HTTP_OK_MIN = 200;
            const HTTP_OK_MAX = 300;
            if (xhr.status >= HTTP_OK_MIN && xhr.status < HTTP_OK_MAX) {
              console.log(`Upload succeeded for ${file.file.name}:`, xhr.responseText || "No response text");
              updateFileStatus(index, "success");
              resolve();
            } else {
              console.error(`Upload failed for ${file.file.name}:`, {
                status: xhr.status,
                statusText: xhr.statusText,
                response: xhr.responseText || "No response text"
              });
              updateFileStatus(
                index,
                "error",
                `Upload failed with status ${xhr.status}: ${xhr.statusText}`
              );
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => {
            updateFileStatus(index, "error", "Network error occurred");
            reject(new Error("Network error occurred"));
          });

          xhr.addEventListener("abort", () => {
            updateFileStatus(index, "error", "Upload aborted");
            reject(new Error("Upload aborted"));
          });

          // Make sure we're using the full URL from the token, not just the path
          // This ensures we're posting to the presigned URL from MinIO, not to a relative path
          
          // Log the raw URL from the token
          console.log("Raw token URL:", token.uploadUrl);
          
          // Parse the URL to ensure we're using the full URL
          let uploadUrl: string;
          try {
            // Try to parse as a URL - this will throw if it's not a valid URL
            new URL(token.uploadUrl);
            // If it doesn't throw, it's a valid absolute URL
            uploadUrl = token.uploadUrl;
          } catch (_error) {
            // If parsing fails, it's likely a relative URL
            // Prepend the origin to make it absolute
            uploadUrl = `${window.location.origin}${token.uploadUrl.startsWith('/') ? '' : '/'}${token.uploadUrl}`;
          }
          
          // Log the final URL we're posting to for debugging
          console.log(`Uploading to: ${uploadUrl}`);
          
          xhr.open("POST", uploadUrl);
          xhr.send(formData);
        });
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Finalize the upload
      setStatus("finalizing");
      const finalizeResult = await actions.finalizeUpload(identifier);

      if (finalizeResult.success) {
        setStatus("success");
        onComplete?.(files);
      } else {
        setStatus("error");
        throw new Error(finalizeResult.message);
      }
    } catch (error) {
      setStatus("error");

      // If we have an identifier, try to cancel the upload
      if (uploadIdentifier) {
        try {
          await actions.cancelUpload(uploadIdentifier);
        } catch (cancelError) {
          // Unable to cancel upload
          // eslint-disable-next-line no-console
          console.error("Failed to cancel upload:", cancelError);
        }
      }

      onError?.(
        error instanceof Error ? error : new Error(String(error)),
        files
      );
    }
  }, [
    files,
    actions,
    updateFileProgress,
    updateFileStatus,
    onComplete,
    onError,
    uploadIdentifier,
  ]);

  /**
   * Cancel the current upload
   */
  const cancelUpload = useCallback(async () => {
    if (!uploadIdentifier) {
      return;
    }

    try {
      setStatus("idle");
      await actions.cancelUpload(uploadIdentifier);
      setUploadIdentifier(null);
    } catch (error) {
      // Unable to cancel upload
      // eslint-disable-next-line no-console
      console.error("Failed to cancel upload:", error);
    }
  }, [actions, uploadIdentifier]);

  return {
    files,
    status,
    addFiles,
    removeFile,
    startUpload,
    cancelUpload,
    reset,
    isUploading:
      status === "uploading" ||
      status === "preparing" ||
      status === "finalizing",
  };
}
