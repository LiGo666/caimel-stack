"use client";

import { useState, useCallback } from "react";
import { FileUploadConfig, FileUploadResponse, UploadedFile } from "../types";
import { getPresignedUrl } from "../actions/upload";

interface UseFileUploadOptions {
  config?: Partial<FileUploadConfig>;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
}

interface UseFileUploadReturn {
  uploadFiles: (files: File[]) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploading: boolean;
  progress: Record<string, number>;
  uploadedFiles: UploadedFile[];
  error: string | null;
  reset: () => void;
}

export function useFileUpload({
  config,
  onUploadComplete,
  onUploadError,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({});
    setUploadedFiles([]);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      // Initialize progress for this file
      setProgress((prev) => ({ ...prev, [file.name]: 0 }));
      
      // Get presigned URL
      const response: FileUploadResponse = await getPresignedUrl(
        {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
        config
      );
      
      if (!response.success || !response.presignedUrl) {
        throw new Error(response.error || "Failed to get upload URL");
      }
      
      // Create form data for upload
      const formData = new FormData();
      
      // Add fields from presigned URL if available
      if (response.presignedUrl.fields) {
        Object.entries(response.presignedUrl.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // Add file as the last field
      formData.append("file", file);
      
      // Upload to MinIO
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setProgress((prev) => ({ ...prev, [file.name]: progress }));
        }
      });
      
      // Send the request
      xhr.open("POST", response.presignedUrl.url);
      
      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Success
            const uploadedFile: UploadedFile = {
              key: response.presignedUrl!.key,
              name: file.name,
              size: file.size,
              type: file.type,
              url: response.presignedUrl!.url,
            };
            
            setUploadedFiles((prev) => [...prev, uploadedFile]);
            resolve();
          } else {
            // Error
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };
        
        xhr.send(formData);
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown upload error";
      setError(errorMessage);
      
      // Call onUploadError callback
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      
      throw err;
    }
  }, [config, onUploadError]);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    setError(null);
    const uploadedResults: UploadedFile[] = [];
    
    try {
      // Upload each file
      for (const file of files) {
        try {
          await uploadFile(file);
          
          // Get the latest uploaded file
          const latestUploadedFile = uploadedFiles[uploadedFiles.length - 1];
          if (latestUploadedFile) {
            uploadedResults.push(latestUploadedFile);
          }
        } catch (err) {
          // Continue with other files even if one fails
          console.error(`Error uploading ${file.name}:`, err);
        }
      }
      
      // Call onUploadComplete callback
      if (uploadedResults.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedResults);
      }
      
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadedFiles, onUploadComplete]);

  return {
    uploadFiles,
    uploadFile,
    uploading,
    progress,
    uploadedFiles,
    error,
    reset,
  };
}
