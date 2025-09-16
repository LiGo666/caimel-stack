import type { Metadata } from "next";
import { getAllUploadSessionsAction } from "@/features/file-upload/actions/fileUploadManagerActions";
import { FileUploadManager } from "@/features/file-upload/components/FileUploadManager";

export const metadata: Metadata = {
  title: "File Upload Manager",
  description: "Manage file upload sessions and processing jobs",
};

export default async function FileUploadManagerPage() {
  // Fetch data server-side for debugging
  const response = await getAllUploadSessionsAction();
  const debugData = Array.isArray(response.data) ? response.data : [];

  return (
    <>
      <FileUploadManager />
      {/* Debug section - only visible during development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 rounded-lg border border-gray-300 border-dashed p-4">
          <h2 className="mb-2 font-semibold text-lg">
            Debug Info (Server-Side Data)
          </h2>
          <p>Found {debugData.length} sessions in database</p>
          <pre className="max-h-[300px] overflow-auto rounded bg-gray-100 p-2 text-xs">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
