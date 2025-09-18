"use client";

import { FileUpload } from "@features/file-upload/components/FileUpload";
import {
  cancelUploadAction,
  finalizeUploadAction,
  generateUploadTokensAction,
} from "./(actions)/betterMockFileUploadAction";

// Constants to avoid magic numbers and improve readability
const MAX_FILES = 5;
const MAX_SIZE_MB = 5000;
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "text/plain",
  "application/pdf",
];

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="mb-4 font-bold text-2xl">File Upload Example</h1>
      <p className="mb-4">
        This example demonstrates how to use the FileUpload component with the
        betterMockFileUploadAction.
      </p>

      <FileUpload
        actions={{
          cancelUpload: cancelUploadAction,
          finalizeUpload: finalizeUploadAction,
          generateUploadTokens: generateUploadTokensAction,
        }}
        allowedTypes={ALLOWED_TYPES}
        maxFiles={MAX_FILES}
        maxSizeMB={MAX_SIZE_MB}
        onComplete={(files) => {
          // biome-ignore lint/suspicious/noConsole: Demo purposes only
          console.log("Upload completed:", files);
        }}
        onError={(error) => {
          // biome-ignore lint/suspicious/noConsole: Demo purposes only
          console.error("Upload error:", error);
        }}
      />
    </div>
  );
}
