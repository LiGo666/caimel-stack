"use client";

import { useCallback, useRef, useState } from "react";
import {
  abortMultipartUploadAction,
  completeMultipartUploadAction,
  generatePartUploadUrlAction,
  initiateFileUploadAction,
} from "@/app/admin/protected/test/fileupload/(actions)/enhancedFileUploadAction";
import type { FileUploadConfig, UploadedFile } from "../types";

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // KB/s
}

export interface FileUploadCallbacks {
  onProgress?: (progress: FileUploadProgress) => void;
  onComplete?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
}

export interface UploadSession {
  sessionId: string;
  fileName: string;
  uploadType: "direct" | "multipart";
  presignedUrl?: any;
  multipartUploadId?: string;
  totalParts?: number;
}

export interface GroupUploadProgress {
  [fileName: string]: FileUploadProgress;
}

// Chunk size for multipart uploads (50MB)
const CHUNK_SIZE = 50 * 1024 * 1024;

export function useEnhancedFileUploadManager() {
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const [uploadProgress, setUploadProgress] = useState<GroupUploadProgress>({});

  /**
   * Upload multiple files with transparent method selection
   */
  const uploadMultipleFiles = useCallback(
    async (
      files: File[],
      config?: Partial<FileUploadConfig>,
      callbacks?: {
        onGroupProgress?: (progress: GroupUploadProgress) => void;
        onGroupComplete?: (files: UploadedFile[]) => void;
        onGroupError?: (error: string) => void;
        onFileProgress?: (
          fileName: string,
          progress: FileUploadProgress
        ) => void;
        onFileComplete?: (fileName: string, file: UploadedFile) => void;
        onFileError?: (fileName: string, error: string) => void;
      }
    ): Promise<UploadedFile[]> => {
      console.log(`[EnhancedUpload] Starting upload for ${files.length} files`);

      // Handle empty files array early
      if (files.length === 0) {
        console.log("[EnhancedUpload] No files to upload");
        return [];
      }

      try {
        // Prepare file upload requests
        const fileRequests = files.map((file) => ({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }));

        // Initiate upload sessions
        const initResult = await initiateFileUploadAction({
          files: fileRequests,
          groupName:
            files.length > 1 ? `Upload ${new Date().toISOString()}` : undefined,
        });

        if (!(initResult.success && initResult.sessions)) {
          throw new Error(initResult.error || "Failed to initiate upload");
        }

        const uploadResults: UploadedFile[] = [];
        const progressMap: GroupUploadProgress = {};

        // Process each file upload
        await Promise.all(
          initResult.sessions.map(async (session, index) => {
            const file = files[index];
            const fileName = file.name;

            try {
              progressMap[fileName] = {
                loaded: 0,
                total: file.size,
                percentage: 0,
                speed: 0,
              };
              setUploadProgress({ ...progressMap });

              let uploadedFile: UploadedFile;

              if (session.uploadType === "direct") {
                uploadedFile = await uploadDirectFile(file, session, {
                  onProgress: (progress) => {
                    progressMap[fileName] = progress;
                    setUploadProgress({ ...progressMap });
                    callbacks?.onGroupProgress?.(progressMap);
                    callbacks?.onFileProgress?.(fileName, progress);
                  },
                });
              } else {
                uploadedFile = await uploadMultipartFile(file, session, {
                  onProgress: (progress) => {
                    progressMap[fileName] = progress;
                    setUploadProgress({ ...progressMap });
                    callbacks?.onGroupProgress?.(progressMap);
                    callbacks?.onFileProgress?.(fileName, progress);
                  },
                });
              }

              uploadResults.push(uploadedFile);
              callbacks?.onFileComplete?.(fileName, uploadedFile);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : "Upload failed";
              console.error(
                `[EnhancedUpload] Error uploading ${fileName}:`,
                error
              );
              callbacks?.onFileError?.(fileName, errorMessage);
            }
          })
        );

        callbacks?.onGroupComplete?.(uploadResults);
        return uploadResults;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Group upload failed";
        console.error("[EnhancedUpload] Group upload error:", error);
        callbacks?.onGroupError?.(errorMessage);
        throw error;
      }
    },
    []
  );

  /**
   * Upload a single file using direct upload
   */
  const uploadDirectFile = useCallback(
    async (
      file: File,
      session: UploadSession,
      callbacks?: FileUploadCallbacks
    ): Promise<UploadedFile> => {
      console.log(`[EnhancedUpload] Direct upload for ${file.name}`);

      return new Promise<UploadedFile>((resolve, reject) => {
        const formData = new FormData();
        const { url, fields, key } = session.presignedUrl;

        // Add all fields from presigned URL
        Object.entries(fields).forEach(([fieldName, fieldValue]) => {
          formData.append(fieldName, fieldValue as string);
        });
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        const abortController = new AbortController();
        abortControllersRef.current[file.name] = abortController;

        let lastProgressTime = Date.now();
        let lastLoaded = 0;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && callbacks?.onProgress) {
            const now = Date.now();
            const timeDiff = now - lastProgressTime;
            const loadedDiff = event.loaded - lastLoaded;

            let speed = 0;
            if (timeDiff > 100) {
              speed =
                timeDiff > 0
                  ? Math.round(((loadedDiff / timeDiff) * 1000) / 1024)
                  : 0;
              lastProgressTime = now;
              lastLoaded = event.loaded;
            }

            callbacks.onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
              speed,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const uploadedFile: UploadedFile = {
              key,
              name: file.name,
              size: file.size,
              type: file.type,
              url: `#uploaded-${key}`,
            };
            callbacks?.onComplete?.(uploadedFile);
            resolve(uploadedFile);
          } else {
            const error = new Error(`Upload failed with status ${xhr.status}`);
            callbacks?.onError?.(error);
            reject(error);
          }
        };

        xhr.onerror = () => {
          const error = new Error("Network error during upload");
          callbacks?.onError?.(error);
          reject(error);
        };

        abortController.signal.addEventListener("abort", () => {
          xhr.abort();
        });

        xhr.open("POST", url);
        xhr.send(formData);
      });
    },
    []
  );

  /**
   * Upload a file using multipart upload
   */
  const uploadMultipartFile = useCallback(
    async (
      file: File,
      session: UploadSession,
      callbacks?: FileUploadCallbacks
    ): Promise<UploadedFile> => {
      console.log(
        `[EnhancedUpload] Multipart upload for ${file.name} with ${session.totalParts} parts`
      );

      try {
        const totalParts = session.totalParts || 1;
        const parts: Array<{ partNumber: number; etag: string }> = [];
        let totalLoaded = 0;
        const startTime = Date.now();

        // Upload each part
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          const start = (partNumber - 1) * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          console.log(
            `[EnhancedUpload] Uploading part ${partNumber}/${totalParts} (${chunk.size} bytes)`
          );

          // Get presigned URL for this part
          const partUrlResult = await generatePartUploadUrlAction(
            session.sessionId,
            partNumber
          );

          if (!(partUrlResult.success && partUrlResult.url)) {
            throw new Error(
              `Failed to get URL for part ${partNumber}: ${partUrlResult.error}`
            );
          }

          // Upload the part
          const etag = await uploadPart(chunk, partUrlResult.url, partNumber, {
            onPartProgress: (loaded) => {
              const currentTotalLoaded = totalLoaded + loaded;
              const percentage = Math.round(
                (currentTotalLoaded / file.size) * 100
              );
              const elapsed = Date.now() - startTime;
              const speed =
                elapsed > 0
                  ? Math.round(((currentTotalLoaded / elapsed) * 1000) / 1024)
                  : 0;

              callbacks?.onProgress?.({
                loaded: currentTotalLoaded,
                total: file.size,
                percentage,
                speed,
              });
            },
          });

          parts.push({ partNumber, etag });
          totalLoaded += chunk.size;

          // Update final progress for this part
          const percentage = Math.round((totalLoaded / file.size) * 100);
          const elapsed = Date.now() - startTime;
          const speed =
            elapsed > 0
              ? Math.round(((totalLoaded / elapsed) * 1000) / 1024)
              : 0;

          callbacks?.onProgress?.({
            loaded: totalLoaded,
            total: file.size,
            percentage,
            speed,
          });
        }

        // Complete multipart upload
        console.log(
          `[EnhancedUpload] Completing multipart upload for ${file.name}`
        );
        const completeResult = await completeMultipartUploadAction(
          session.sessionId,
          parts
        );

        if (!completeResult.success) {
          throw new Error(
            `Failed to complete multipart upload: ${completeResult.error}`
          );
        }

        const uploadedFile: UploadedFile = {
          key: session.sessionId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: `#uploaded-${session.sessionId}`,
        };

        callbacks?.onComplete?.(uploadedFile);
        return uploadedFile;
      } catch (error) {
        // Abort multipart upload on error
        try {
          await abortMultipartUploadAction(session.sessionId);
        } catch (abortError) {
          console.error("Failed to abort multipart upload:", abortError);
        }

        const uploadError =
          error instanceof Error ? error : new Error("Multipart upload failed");
        callbacks?.onError?.(uploadError);
        throw uploadError;
      }
    },
    []
  );

  /**
   * Upload a single part of a multipart upload
   */
  const uploadPart = useCallback(
    async (
      chunk: Blob,
      presignedUrl: string,
      partNumber: number,
      callbacks?: { onPartProgress?: (loaded: number) => void }
    ): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && callbacks?.onPartProgress) {
            callbacks.onPartProgress(event.loaded);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader("ETag");
            if (!etag) {
              reject(new Error(`No ETag received for part ${partNumber}`));
              return;
            }
            // Remove quotes from ETag if present
            const cleanEtag = etag.replace(/"/g, "");
            resolve(cleanEtag);
          } else {
            reject(
              new Error(
                `Part ${partNumber} upload failed with status ${xhr.status}`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(new Error(`Network error uploading part ${partNumber}`));
        };

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(chunk);
      });
    },
    []
  );

  /**
   * Cancel file upload
   */
  const cancelFileUpload = useCallback((fileName: string) => {
    console.log(`[EnhancedUpload] Cancelling upload for ${fileName}`);

    const controller = abortControllersRef.current[fileName];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[fileName];
    }
  }, []);

  /**
   * Cancel all uploads
   */
  const cancelAllUploads = useCallback(() => {
    console.log("[EnhancedUpload] Cancelling all uploads");
    Object.values(abortControllersRef.current).forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current = {};
    setUploadProgress({});
  }, []);

  return {
    uploadMultipleFiles,
    cancelFileUpload,
    cancelAllUploads,
    uploadProgress,
  };
}
