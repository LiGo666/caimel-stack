import type { NextRequest } from "next/server";
import { FilePartRepository } from "@/features/file-upload/lib/file-part-repository";
import { UploadSessionRepository } from "@/features/file-upload/lib/file-upload-session-manager";
import { UploadGroupRepository } from "@/features/file-upload/lib/upload-group-repository";
import {
  FileStatus,
  GroupStatus,
  PartStatus,
} from "@/features/file-upload/types/database";

// Initialize repositories
const uploadSessionRepo = new UploadSessionRepository();
const uploadGroupRepo = new UploadGroupRepository();
const filePartRepo = new FilePartRepository();

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId");

  if (!(groupId || sessionId || userId)) {
    return new Response(
      "Missing required parameter: groupId, sessionId, or userId",
      { status: 400 }
    );
  }

  const connectionId = `${groupId || sessionId || userId}-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      // Store connection for broadcasting updates
      connections.set(connectionId, controller);

      // Send initial connection message
      const initialMessage = {
        type: "connected",
        connectionId,
        timestamp: new Date().toISOString(),
      };

      controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

      // Send initial status if specific IDs provided
      if (groupId) {
        sendGroupStatus(controller, groupId);
      } else if (sessionId) {
        sendSessionStatus(controller, sessionId);
      } else if (userId) {
        sendUserStatus(controller, userId);
      }
    },

    cancel() {
      // Clean up connection
      connections.delete(connectionId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

/**
 * Send group status update
 */
async function sendGroupStatus(
  controller: ReadableStreamDefaultController,
  groupId: string
) {
  try {
    const group = await uploadGroupRepo.findById(groupId);
    if (!group) return;

    const message = {
      type: "group_update",
      groupId,
      status: group.status,
      totalFiles: group.totalFiles,
      completedFiles: group.completedFiles,
      sessions: group.sessions?.map((session) => ({
        id: session.id,
        objectKey: session.objectKey,
        status: session.status,
        uploadedAt: session.uploadedAt,
        totalParts: session.totalParts,
        completedParts: session.completedParts,
        parts: session.parts?.map((part) => ({
          partNumber: part.partNumber,
          status: part.status,
          size: part.size,
          uploadedAt: part.uploadedAt,
        })),
      })),
      timestamp: new Date().toISOString(),
    };

    controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
  } catch (error) {
    console.error("Error sending group status:", error);
  }
}

/**
 * Send session status update
 */
async function sendSessionStatus(
  controller: ReadableStreamDefaultController,
  sessionId: string
) {
  try {
    const session = await uploadSessionRepo.findById(sessionId);
    if (!session) return;

    const message = {
      type: "session_update",
      sessionId,
      status: session.status,
      objectKey: session.objectKey,
      uploadedAt: session.uploadedAt,
      totalParts: session.totalParts,
      completedParts: session.completedParts,
      parts: session.parts?.map((part) => ({
        partNumber: part.partNumber,
        status: part.status,
        size: part.size,
        uploadedAt: part.uploadedAt,
      })),
      timestamp: new Date().toISOString(),
    };

    controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
  } catch (error) {
    console.error("Error sending session status:", error);
  }
}

/**
 * Send user status update
 */
async function sendUserStatus(
  controller: ReadableStreamDefaultController,
  userId: string
) {
  try {
    const groups = await uploadGroupRepo.findByUserId(userId, 10);
    const sessions = await uploadSessionRepo.findByUserId(userId, 20);

    const message = {
      type: "user_update",
      userId,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        status: group.status,
        totalFiles: group.totalFiles,
        completedFiles: group.completedFiles,
      })),
      sessions: sessions
        .filter((s) => !s.groupId)
        .map((session) => ({
          id: session.id,
          objectKey: session.objectKey,
          status: session.status,
          uploadedAt: session.uploadedAt,
        })),
      timestamp: new Date().toISOString(),
    };

    controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
  } catch (error) {
    console.error("Error sending user status:", error);
  }
}

/**
 * Broadcast update to all relevant connections
 */
export async function broadcastUpdate(
  type: "group" | "session" | "user",
  id: string
) {
  for (const [connectionId, controller] of connections) {
    try {
      if (type === "group") {
        await sendGroupStatus(controller, id);
      } else if (type === "session") {
        await sendSessionStatus(controller, id);
      } else if (type === "user") {
        await sendUserStatus(controller, id);
      }
    } catch (error) {
      // Connection might be closed, remove it
      connections.delete(connectionId);
    }
  }
}

// Export connection management for use by other parts of the system
export { connections };
