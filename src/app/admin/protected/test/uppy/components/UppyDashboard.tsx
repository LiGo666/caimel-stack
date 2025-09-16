"use client";

import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import Tus from "@uppy/tus";
import Webcam from "@uppy/webcam";
import { useState } from "react";

// Using Tailwind styling instead of Uppy CSS imports

function createUppy() {
  return new Uppy({
    id: "uppy",
    autoProceed: false,
    debug: true,
    restrictions: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxNumberOfFiles: 10,
      allowedFileTypes: null, // Allow all file types
    },
  })
    .use(Tus, {
      endpoint: "/api/upload",
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
    })
    .use(Webcam, {
      mirror: true,
      modes: ["video-only", "audio-only", "picture", "video-audio"],
      showRecordingLength: true,
    });
}

export default function UppyDashboard() {
  // Use initializer function to prevent recreating the Uppy instance on re-renders
  const [uppy] = useState(createUppy);

  return (
    <div className="mb-10 rounded-lg border border-gunmetal-secondary bg-gunmetal p-6 shadow-lg">
      <div className="mb-4">
        <h2 className="mb-2 font-semibold text-foreground text-xl">
          Upload Files
        </h2>
        <p className="text-muted-foreground">
          Drag and drop files here or click to browse
        </p>
      </div>
      <Dashboard
        className="overflow-hidden rounded-md"
        height={470}
        hideProgressDetails={false}
        plugins={["Webcam"]}
        proudlyDisplayPoweredByUppy={false}
        uppy={uppy}
        width="100%"
      />
    </div>
  );
}
