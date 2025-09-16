"use client";
import UppyDashboard from "./components/UppyDashboard";

export default function UppyTestPage() {
  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-8 border-gunmetal-secondary border-b pb-4">
        <h1 className="bg-gradient-to-r from-primary to-info bg-clip-text font-bold text-3xl text-transparent">
          File Upload Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload, manage, and organize your files with our intuitive dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="rounded-xl bg-gunmetal-light/10 p-6 shadow-lg backdrop-blur-sm">
          <UppyDashboard />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gunmetal-secondary bg-gunmetal p-6">
            <h2 className="mb-3 flex items-center font-semibold text-xl">
              <span className="mr-2">📋</span> Upload Guidelines
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2 text-success">✓</span> Maximum file size:
                10MB
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-success">✓</span> Upload up to 10
                files at once
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-success">✓</span> All file types
                supported
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-gunmetal-secondary bg-gunmetal p-6">
            <h2 className="mb-3 flex items-center font-semibold text-xl">
              <span className="mr-2">🎥</span> Media Capture
            </h2>
            <p className="mb-4 text-muted-foreground">
              Use the Webcam feature to capture photos and videos directly from
              your device.
            </p>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-info/20 px-3 py-1 text-info text-xs">
                Video
              </span>
              <span className="rounded-full bg-success/20 px-3 py-1 text-success text-xs">
                Audio
              </span>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-primary text-xs">
                Photos
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
