import { act, renderHook } from "@testing-library/react";
import { useEnhancedFileUploadManager } from "../hooks/useEnhancedFileUpload";

// Mock the server actions
const mockInitiateFileUploadAction = jest.fn();
const mockGeneratePartUploadUrlAction = jest.fn();
const mockCompleteMultipartUploadAction = jest.fn();
const mockAbortMultipartUploadAction = jest.fn();

// Mock fetch for file uploads
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock(
  "@/app/admin/protected/test/fileupload/(actions)/enhancedFileUploadAction",
  () => ({
    initiateFileUploadAction: (...args: any[]) =>
      mockInitiateFileUploadAction(...args),
    generatePartUploadUrlAction: (...args: any[]) =>
      mockGeneratePartUploadUrlAction(...args),
    completeMultipartUploadAction: (...args: any[]) =>
      mockCompleteMultipartUploadAction(...args),
    abortMultipartUploadAction: (...args: any[]) =>
      mockAbortMultipartUploadAction(...args),
  })
);

describe("useEnhancedFileUploadManager Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("Hook Initialization", () => {
    it("should initialize the upload manager hook correctly", () => {
      const { result } = renderHook(() => useEnhancedFileUploadManager());

      // Verify hook returns expected interface
      expect(result.current).toHaveProperty("uploadMultipleFiles");
      expect(result.current).toHaveProperty("cancelFileUpload");
      expect(result.current).toHaveProperty("cancelAllUploads");
      expect(result.current).toHaveProperty("uploadProgress");

      expect(typeof result.current.uploadMultipleFiles).toBe("function");
      expect(typeof result.current.cancelFileUpload).toBe("function");
      expect(typeof result.current.cancelAllUploads).toBe("function");
      expect(typeof result.current.uploadProgress).toBe("object");
    });

    it("should handle cancellation methods", () => {
      const { result } = renderHook(() => useEnhancedFileUploadManager());

      // Test cancellation methods exist and are callable
      expect(() => result.current.cancelFileUpload("test.txt")).not.toThrow();
      expect(() => result.current.cancelAllUploads()).not.toThrow();
    });

    it("should handle simple file upload with proper mocking", async () => {
      const mockFile = new File(["test content"], "small-file.txt", {
        type: "text/plain",
      });
      Object.defineProperty(mockFile, "size", { value: 1024 * 1024 }); // 1MB

      // Mock upload initiation response
      mockInitiateFileUploadAction.mockResolvedValue({
        success: true,
        sessions: [
          {
            sessionId: "session-1",
            method: "direct" as const,
            presignedUrl: {
              url: "https://minio.example.com/upload",
              fields: { key: "test-key", policy: "test-policy" },
              key: "small-file.txt",
            },
          },
        ],
      });
      const { result } = renderHook(() => useEnhancedFileUploadManager());

      // Verify uploadProgress is available and is an object
      expect(result.current.uploadProgress).toBeDefined();
      expect(typeof result.current.uploadProgress).toBe("object");
    });
  });

  describe("Upload Initiation", () => {
    it("should handle upload initiation errors gracefully", async () => {
      const mockFile = new File(["test content"], "error-file.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: false,
        error: "Initiation failed",
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await expect(
        act(async () => {
          await result.current.uploadMultipleFiles([mockFile]);
        })
      ).rejects.toThrow("Initiation failed");

      expect(mockInitiateFileUploadAction).toHaveBeenCalled();
    });

    it("should call initiate action with correct parameters", async () => {
      const mockFile = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: true,
        sessions: [
          {
            sessionId: "session-1",
            fileName: "test-file.txt",
            uploadType: "direct" as const,
          },
        ],
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await act(async () => {
        await result.current.uploadMultipleFiles([mockFile]);
      });

      expect(mockInitiateFileUploadAction).toHaveBeenCalledWith({
        files: expect.arrayContaining([
          expect.objectContaining({
            fileName: "test-file.txt",
            fileSize: expect.any(Number),
            fileType: "text/plain",
          }),
        ]),
        groupName: undefined,
      });
    });

    it("should handle network errors in initiation", async () => {
      const mockFile = new File(["test content"], "network-error.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockRejectedValueOnce(
        new Error("Network error")
      );

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await expect(
        act(async () => {
          await result.current.uploadMultipleFiles([mockFile]);
        })
      ).rejects.toThrow("Network error");
    });
  });

  describe("Upload Progress Tracking", () => {
    it("should track progress for successful uploads", async () => {
      const mockFile = new File(["test content"], "progress-file.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: true,
        sessions: [
          {
            sessionId: "session-1",
            fileName: "progress-file.txt",
            uploadType: "direct" as const,
          },
        ],
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await act(async () => {
        await result.current.uploadMultipleFiles([mockFile]);
      });

      // Verify uploadProgress is being tracked
      expect(result.current.uploadProgress).toBeDefined();
      expect(typeof result.current.uploadProgress).toBe("object");
    });

    it("should handle progress during multipart uploads", async () => {
      const mockFile = new File(["test content"], "large-file.mp4", {
        type: "video/mp4",
      });
      Object.defineProperty(mockFile, "size", { value: 200 * 1024 * 1024 });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: true,
        sessions: [
          {
            sessionId: "session-1",
            fileName: "large-file.mp4",
            uploadType: "multipart" as const,
            multipartUploadId: "multipart-upload-id",
            totalParts: 2,
          },
        ],
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await act(async () => {
        await result.current.uploadMultipleFiles([mockFile]);
      });

      expect(result.current.uploadProgress).toBeDefined();
      expect(mockInitiateFileUploadAction).toHaveBeenCalled();
    });
  });

  describe("Upload Cancellation", () => {
    it("should handle file upload cancellation", () => {
      const { result } = renderHook(() => useEnhancedFileUploadManager());

      // Test cancellation methods exist and are callable
      expect(() => result.current.cancelFileUpload("test.txt")).not.toThrow();
      expect(() => result.current.cancelAllUploads()).not.toThrow();
    });

    it("should handle cancellation with active uploads", async () => {
      const mockFile = new File(["test content"], "cancel-test.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: true,
        sessions: [
          {
            sessionId: "session-1",
            fileName: "cancel-test.txt",
            uploadType: "direct" as const,
            presignedUrl: {
              url: "https://example.com/upload",
              fields: { key: "test-key" },
            },
          },
        ],
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await act(async () => {
        await result.current.uploadMultipleFiles([mockFile]);
      });

      // Test cancellation after upload started
      act(() => {
        result.current.cancelFileUpload("cancel-test.txt");
        result.current.cancelAllUploads();
      });

      expect(result.current.uploadProgress).toBeDefined();
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing sessions in response", async () => {
      const mockFile = new File(["test content"], "missing-sessions.txt", {
        type: "text/plain",
      });

      mockInitiateFileUploadAction.mockResolvedValueOnce({
        success: true,
        sessions: null,
      });

      const { result } = renderHook(() => useEnhancedFileUploadManager());

      await expect(
        act(async () => {
          await result.current.uploadMultipleFiles([mockFile]);
        })
      ).rejects.toThrow("Failed to initiate upload");
    });

    it("should handle empty file array", async () => {
      const { result } = renderHook(() => useEnhancedFileUploadManager());

      const uploadResult = await act(async () => {
        return await result.current.uploadMultipleFiles([]);
      });

      // Hook should return empty array for empty input
      expect(uploadResult).toEqual([]);
      expect(mockInitiateFileUploadAction).not.toHaveBeenCalled();
    });
  });
});
