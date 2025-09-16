import { MinioClient } from "@/features/minio";
import { FilePartRepository } from "../lib/file-part-repository";
import { UploadSessionRepository } from "../lib/file-upload-session-manager";
import { UploadGroupRepository } from "../lib/upload-group-repository";
import { UploadSessionController } from "../lib/upload-session-controller";
import { FileStatus, GroupStatus, PartStatus } from "../types/database";

// Mock all external dependencies
jest.mock("../lib/upload-group-repository");
jest.mock("../lib/file-upload-session-manager");
jest.mock("../lib/file-part-repository");
jest.mock("@/features/minio");

describe.skip("UploadSessionController Integration Tests", () => {
  let controller: UploadSessionController;
  let mockUploadGroupRepo: jest.Mocked<UploadGroupRepository>;
  let mockUploadSessionRepo: jest.Mocked<UploadSessionRepository>;
  let mockFilePartRepo: jest.Mocked<FilePartRepository>;
  let mockMinioClient: jest.Mocked<MinioClient>;

  beforeEach(() => {
    // Create proper mock instances with all required methods
    mockUploadGroupRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<UploadGroupRepository>;

    mockUploadSessionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findByGroupId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<UploadSessionRepository>;

    mockFilePartRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findBySessionId: jest.fn(),
      updateEtag: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<FilePartRepository>;

    mockMinioClient = {
      generatePresignedUrl: jest.fn(),
      initiateMultipartUpload: jest.fn(),
      generatePartUploadUrl: jest.fn(),
      completeMultipartUpload: jest.fn(),
      abortMultipartUpload: jest.fn(),
    } as jest.Mocked<MinioClient>;

    // Mock repository constructors
    jest
      .mocked(UploadGroupRepository)
      .mockImplementation(() => mockUploadGroupRepo);
    jest
      .mocked(UploadSessionRepository)
      .mockImplementation(() => mockUploadSessionRepo);
    jest.mocked(FilePartRepository).mockImplementation(() => mockFilePartRepo);
    jest.mocked(MinioClient).mockImplementation(() => mockMinioClient);

    controller = new UploadSessionController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initiateMultiFileUpload", () => {
    it("should initiate single file direct upload for small files", async () => {
      const files = [
        { name: "small-file.txt", size: 1024 * 1024, type: "text/plain" }, // 1MB file
      ];

      const mockGroup = {
        id: "group-1",
        name: "Test Upload",
        status: GroupStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        userId: null,
      };

      const mockSession = {
        id: "session-1",
        groupId: "group-1",
        objectKey: "uploads/small-file.txt",
        uploadId: null,
        status: FileStatus.PENDING_UPLOAD,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      };

      const mockPresignedUrl = {
        url: "https://minio.example.com/upload",
        fields: { key: "uploads/small-file.txt", policy: "test-policy" },
        key: "uploads/small-file.txt",
      };

      // Setup mocks
      mockUploadGroupRepo.create.mockResolvedValueOnce(mockGroup);
      mockUploadSessionRepo.create.mockResolvedValueOnce(mockSession);
      mockMinioClient.generatePresignedUrl.mockResolvedValueOnce(
        mockPresignedUrl
      );

      const result = await controller.initiateMultiFileUpload(
        files,
        "Test Upload"
      );

      expect(result.success).toBe(true);
      expect(result.data?.groupId).toBe("group-1");
      expect(result.data?.uploads).toHaveLength(1);
      expect(result.data?.uploads[0].method).toBe("direct");
      expect(result.data?.uploads[0].presignedUrl).toEqual(mockPresignedUrl);

      expect(mockUploadGroupRepo.create).toHaveBeenCalledWith({
        name: "Test Upload",
        description: "Multi-file upload with 1 files",
      });
      expect(mockUploadSessionRepo.create).toHaveBeenCalledWith({
        groupId: "group-1",
        objectKey: "uploads/small-file.txt",
      });
      expect(mockMinioClient.generatePresignedUrl).toHaveBeenCalledWith({
        bucketName: "uploads",
        objectName: "uploads/small-file.txt",
        contentType: "text/plain",
        maxFileSize: 1024 * 1024,
      });
    });

    it("should initiate multipart upload for large files", async () => {
      const files = [
        { name: "large-file.mp4", size: 200 * 1024 * 1024, type: "video/mp4" }, // 200MB file
      ];

      const mockGroup = {
        id: "group-1",
        name: "Large File Upload",
        status: GroupStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        userId: null,
      };

      const mockSession = {
        id: "session-1",
        groupId: "group-1",
        objectKey: "uploads/large-file.mp4",
        uploadId: "multipart-upload-id",
        status: FileStatus.UPLOADING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      };

      const mockParts = [
        {
          id: "part-1",
          sessionId: "session-1",
          partNumber: 1,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-2",
          sessionId: "session-1",
          partNumber: 2,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-3",
          sessionId: "session-1",
          partNumber: 3,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-4",
          sessionId: "session-1",
          partNumber: 4,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Setup mocks
      mockUploadGroupRepo.create.mockResolvedValueOnce(mockGroup);
      mockMinioClient.initiateMultipartUpload.mockResolvedValueOnce(
        "multipart-upload-id"
      );
      mockUploadSessionRepo.create.mockResolvedValueOnce(mockSession);
      mockFilePartRepo.createMultiple.mockResolvedValueOnce(mockParts);

      const result = await controller.initiateMultiFileUpload(
        files,
        "Large File Upload"
      );

      expect(result.success).toBe(true);
      expect(result.data?.groupId).toBe("group-1");
      expect(result.data?.uploads).toHaveLength(1);
      expect(result.data?.uploads[0].method).toBe("multipart");
      expect(result.data?.uploads[0].uploadId).toBe("multipart-upload-id");
      expect(result.data?.uploads[0].parts).toHaveLength(4);

      expect(mockMinioClient.initiateMultipartUpload).toHaveBeenCalledWith(
        "uploads",
        "uploads/large-file.mp4",
        "video/mp4"
      );
      expect(mockFilePartRepo.createMultiple).toHaveBeenCalledWith([
        { sessionId: "session-1", partNumber: 1, size: 52_428_800 },
        { sessionId: "session-1", partNumber: 2, size: 52_428_800 },
        { sessionId: "session-1", partNumber: 3, size: 52_428_800 },
        { sessionId: "session-1", partNumber: 4, size: 41_943_040 },
      ]);
    });

    it("should handle mixed file sizes", async () => {
      const files = [
        { name: "small-file.txt", size: 1024 * 1024, type: "text/plain" }, // 1MB
        { name: "large-file.mp4", size: 200 * 1024 * 1024, type: "video/mp4" }, // 200MB
      ];

      const mockGroup = {
        id: "group-1",
        name: "Mixed Upload",
        status: GroupStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        userId: null,
      };

      // Setup mocks for both uploads
      mockUploadGroupRepo.create.mockResolvedValueOnce(mockGroup);

      // Mock for small file (direct upload)
      mockUploadSessionRepo.create.mockResolvedValueOnce({
        id: "session-1",
        groupId: "group-1",
        objectKey: "uploads/small-file.txt",
        uploadId: null,
        status: FileStatus.PENDING_UPLOAD,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      });
      mockMinioClient.generatePresignedUrl.mockResolvedValueOnce({
        url: "https://minio.example.com/upload1",
        fields: { key: "uploads/small-file.txt", policy: "test-policy" },
        key: "uploads/small-file.txt",
      });

      // Mock for large file (multipart upload)
      mockMinioClient.initiateMultipartUpload.mockResolvedValueOnce(
        "multipart-upload-id"
      );
      mockUploadSessionRepo.create.mockResolvedValueOnce({
        id: "session-2",
        groupId: "group-1",
        objectKey: "uploads/large-file.mp4",
        uploadId: "multipart-upload-id",
        status: FileStatus.UPLOADING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      });
      mockFilePartRepo.createMultiple.mockResolvedValueOnce([
        {
          id: "part-1",
          sessionId: "session-2",
          partNumber: 1,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-2",
          sessionId: "session-2",
          partNumber: 2,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-3",
          sessionId: "session-2",
          partNumber: 3,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "part-4",
          sessionId: "session-2",
          partNumber: 4,
          size: 50 * 1024 * 1024,
          status: PartStatus.PENDING,
          etag: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await controller.initiateMultiFileUpload(
        files,
        "Mixed Upload"
      );

      expect(result.success).toBe(true);
      expect(result.data?.uploads).toHaveLength(2);

      // First upload should be direct
      expect(result.data?.uploads[0].method).toBe("direct");
      expect(result.data?.uploads[0].presignedUrl).toBeDefined();

      // Second upload should be multipart
      expect(result.data?.uploads[1].method).toBe("multipart");
      expect(result.data?.uploads[1].uploadId).toBe("multipart-upload-id");
      expect(result.data?.uploads[1].parts).toHaveLength(4);
    });

    it("should handle errors gracefully", async () => {
      const files = [{ name: "test-file.txt", size: 1024, type: "text/plain" }];

      // Mock error in group creation
      mockUploadGroupRepo.create.mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await controller.initiateMultiFileUpload(
        files,
        "Failed Upload"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  describe("generatePartUploadUrl", () => {
    it("should generate part upload URL successfully", async () => {
      mockMinioClient.generatePartUploadUrl.mockResolvedValueOnce(
        "https://minio.example.com/part-upload-url"
      );

      const result = await controller.generatePartUploadUrl("session-1", 1);

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(
        "https://minio.example.com/part-upload-url"
      );
      expect(mockMinioClient.generatePartUploadUrl).toHaveBeenCalledWith(
        "uploads",
        expect.any(String),
        expect.any(String),
        1
      );
    });

    it("should handle part URL generation errors", async () => {
      mockMinioClient.generatePartUploadUrl.mockRejectedValueOnce(
        new Error("MinIO error")
      );

      const result = await controller.generatePartUploadUrl("session-1", 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("MinIO error");
    });
  });

  describe("completeMultipartUpload", () => {
    it("should complete multipart upload successfully", async () => {
      const parts = [
        { partNumber: 1, etag: "etag1" },
        { partNumber: 2, etag: "etag2" },
      ];

      const mockSession = {
        id: "session-1",
        groupId: "group-1",
        objectKey: "uploads/test-file.mp4",
        uploadId: "multipart-upload-id",
        status: FileStatus.UPLOADING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      };

      mockUploadSessionRepo.findById.mockResolvedValueOnce(mockSession);
      mockMinioClient.completeMultipartUpload.mockResolvedValueOnce(
        "final-etag"
      );
      mockUploadSessionRepo.updateStatus.mockResolvedValueOnce({
        ...mockSession,
        status: FileStatus.UPLOADED,
      });

      const result = await controller.completeMultipartUpload(
        "session-1",
        parts
      );

      expect(result.success).toBe(true);
      expect(result.data?.etag).toBe("final-etag");
      expect(mockMinioClient.completeMultipartUpload).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-file.mp4",
        "multipart-upload-id",
        parts
      );
      expect(mockUploadSessionRepo.updateStatus).toHaveBeenCalledWith(
        "session-1",
        FileStatus.UPLOADED
      );
    });

    it("should handle completion errors", async () => {
      const parts = [{ partNumber: 1, etag: "etag1" }];

      mockUploadSessionRepo.findById.mockRejectedValueOnce(
        new Error("Session not found")
      );

      const result = await controller.completeMultipartUpload(
        "invalid-session",
        parts
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Session not found");
    });
  });

  describe("abortMultipartUpload", () => {
    it("should abort multipart upload successfully", async () => {
      const mockSession = {
        id: "session-1",
        groupId: "group-1",
        objectKey: "uploads/test-file.mp4",
        uploadId: "multipart-upload-id",
        status: FileStatus.UPLOADING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
      };

      mockUploadSessionRepo.findById.mockResolvedValueOnce(mockSession);
      mockMinioClient.abortMultipartUpload.mockResolvedValueOnce(undefined);
      mockUploadSessionRepo.updateStatus.mockResolvedValueOnce({
        ...mockSession,
        status: FileStatus.CANCELLED,
      });

      const result = await controller.abortMultipartUpload("session-1");

      expect(result.success).toBe(true);
      expect(mockMinioClient.abortMultipartUpload).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-file.mp4",
        "multipart-upload-id"
      );
      expect(mockUploadSessionRepo.updateStatus).toHaveBeenCalledWith(
        "session-1",
        FileStatus.CANCELLED
      );
    });

    it("should handle abort errors", async () => {
      mockUploadSessionRepo.findById.mockRejectedValueOnce(
        new Error("Session not found")
      );

      const result = await controller.abortMultipartUpload("invalid-session");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Session not found");
    });
  });
});
