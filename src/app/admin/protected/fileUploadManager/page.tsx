import { FileUploadManager } from "@/features/file-upload/components/FileUploadManager"
import { Metadata } from "next"
import { getAllUploadSessionsAction } from "@/features/file-upload/actions/fileUploadManagerActions"

export const metadata: Metadata = {
  title: "File Upload Manager",
  description: "Manage file upload sessions and processing jobs",
}

export default async function FileUploadManagerPage() {
  // Fetch data server-side for debugging
  const response = await getAllUploadSessionsAction()
  const debugData = Array.isArray(response.data) ? response.data : []
  
  return (
    <>
      <FileUploadManager />
      {/* Debug section - only visible during development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Info (Server-Side Data)</h2>
          <p>Found {debugData.length} sessions in database</p>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-[300px]">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </>
  )
}
