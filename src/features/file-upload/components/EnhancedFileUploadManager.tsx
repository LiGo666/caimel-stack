"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/features/shadcn/components/ui/badge";
import { Button } from "@/features/shadcn/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shadcn/components/ui/card";
import { Progress } from "@/features/shadcn/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/shadcn/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/shadcn/components/ui/tabs";
import { FileStatus, GroupStatus, PartStatus } from "../types/database";

// Types for SSE events
interface SSEMessage {
  type: "connected" | "group_update" | "session_update" | "user_update";
  connectionId?: string;
  timestamp: string;
  [key: string]: any;
}

interface UploadGroup {
  id: string;
  name: string;
  status: GroupStatus;
  totalFiles: number;
  completedFiles: number;
  createdAt: string;
  sessions?: UploadSession[];
}

interface UploadSession {
  id: string;
  objectKey: string;
  status: FileStatus;
  uploadedAt?: string;
  totalParts?: number;
  completedParts?: number;
  parts?: FilePart[];
}

interface FilePart {
  partNumber: number;
  status: PartStatus;
  size: number;
  uploadedAt?: string;
}

interface FileUploadManagerProps {
  userId?: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function EnhancedFileUploadManager({
  userId,
  className = "",
  autoRefresh = true,
  refreshInterval = 5000,
}: FileUploadManagerProps) {
  const [groups, setGroups] = useState<UploadGroup[]>([]);
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UploadGroup | null>(null);
  const [selectedSession, setSelectedSession] = useState<UploadSession | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionId, setConnectionId] = useState<string>("");

  // SSE connection for real-time updates
  const connectSSE = useCallback(() => {
    if (!userId) return;

    const eventSource = new EventSource(
      `/api/upload-progress?userId=${userId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log("[FileUploadManager] SSE Message:", message);

        setLastUpdate(new Date());

        switch (message.type) {
          case "connected":
            setIsConnected(true);
            setConnectionId(message.connectionId || "");
            break;

          case "user_update":
            if (message.groups) {
              setGroups(message.groups);
            }
            if (message.sessions) {
              setSessions(message.sessions);
            }
            break;

          case "group_update":
            setGroups((prev) =>
              prev.map((group) =>
                group.id === message.groupId ? { ...group, ...message } : group
              )
            );
            break;

          case "session_update":
            setSessions((prev) =>
              prev.map((session) =>
                session.id === message.sessionId
                  ? { ...session, ...message }
                  : session
              )
            );
            break;
        }
      } catch (error) {
        console.error("[FileUploadManager] Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.warn("[FileUploadManager] SSE connection error, will retry...");
    };

    return eventSource;
  }, [userId]);

  // Initialize SSE connection
  useEffect(() => {
    if (!(autoRefresh && userId)) return;

    const eventSource = connectSSE();

    return () => {
      eventSource?.close();
      setIsConnected(false);
    };
  }, [connectSSE, autoRefresh, userId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (
    status: FileStatus | GroupStatus | PartStatus
  ): string => {
    switch (status) {
      case FileStatus.COMPLETED:
      case GroupStatus.COMPLETED:
      case PartStatus.UPLOADED:
        return "bg-green-500";
      case FileStatus.UPLOADING:
      case GroupStatus.IN_PROGRESS:
      case PartStatus.UPLOADING:
        return "bg-blue-500";
      case FileStatus.FAILED:
      case GroupStatus.FAILED:
      case PartStatus.FAILED:
        return "bg-red-500";
      case FileStatus.PROCESSING:
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: FileStatus | GroupStatus | PartStatus) => {
    switch (status) {
      case FileStatus.COMPLETED:
      case GroupStatus.COMPLETED:
      case PartStatus.UPLOADED:
        return <CheckCircle className="h-4 w-4" />;
      case FileStatus.UPLOADING:
      case GroupStatus.IN_PROGRESS:
      case PartStatus.UPLOADING:
        return <Upload className="h-4 w-4" />;
      case FileStatus.FAILED:
      case GroupStatus.FAILED:
      case PartStatus.FAILED:
        return <XCircle className="h-4 w-4" />;
      case FileStatus.PROCESSING:
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const calculateGroupProgress = (group: UploadGroup): number => {
    if (group.totalFiles === 0) return 0;
    return Math.round((group.completedFiles / group.totalFiles) * 100);
  };

  const calculateSessionProgress = (session: UploadSession): number => {
    if (!session.totalParts || session.totalParts === 0) {
      return session.status === FileStatus.COMPLETED ? 100 : 0;
    }
    return Math.round(
      ((session.completedParts || 0) / session.totalParts) * 100
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">File Upload Manager</h2>
          <p className="text-gray-600">Monitor and manage your file uploads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
          <span className="text-gray-500 text-sm">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="mr-3 h-8 w-8 text-blue-500" />
            <div>
              <p className="font-medium text-gray-600 text-sm">Total Groups</p>
              <p className="font-bold text-2xl">{groups.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <FileText className="mr-3 h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium text-gray-600 text-sm">
                Total Sessions
              </p>
              <p className="font-bold text-2xl">{sessions.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="mr-3 h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium text-gray-600 text-sm">Completed</p>
              <p className="font-bold text-2xl">
                {
                  [
                    ...groups.filter((g) => g.status === GroupStatus.COMPLETED),
                    ...sessions.filter(
                      (s) => s.status === FileStatus.COMPLETED
                    ),
                  ].length
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertCircle className="mr-3 h-8 w-8 text-red-500" />
            <div>
              <p className="font-medium text-gray-600 text-sm">Failed</p>
              <p className="font-bold text-2xl">
                {
                  [
                    ...groups.filter((g) => g.status === GroupStatus.FAILED),
                    ...sessions.filter((s) => s.status === FileStatus.FAILED),
                  ].length
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs className="w-full" defaultValue="groups">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">Upload Groups</TabsTrigger>
          <TabsTrigger value="sessions">Upload Sessions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent className="space-y-4" value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Upload Groups</CardTitle>
              <CardDescription>Groups of related file uploads</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No upload groups found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          {group.name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(group.status)}>
                            {getStatusIcon(group.status)}
                            <span className="ml-1">{group.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress
                              className="h-2"
                              value={calculateGroupProgress(group)}
                            />
                            <span className="mt-1 text-gray-500 text-xs">
                              {group.completedFiles}/{group.totalFiles}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{group.totalFiles}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDate(group.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => setSelectedGroup(group)}
                            size="sm"
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent className="space-y-4" value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sessions</CardTitle>
              <CardDescription>Individual file upload sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No upload sessions found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.objectKey.split("/").pop()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{session.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress
                              className="h-2"
                              value={calculateSessionProgress(session)}
                            />
                            {session.totalParts && (
                              <span className="mt-1 text-gray-500 text-xs">
                                {session.completedParts}/{session.totalParts}{" "}
                                parts
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {session.totalParts ? "Multipart" : "Direct"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {session.uploadedAt
                            ? formatDate(session.uploadedAt)
                            : "Pending"}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => setSelectedSession(session)}
                            size="sm"
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent className="space-y-4" value="details">
          {selectedGroup && (
            <Card>
              <CardHeader>
                <CardTitle>Group Details: {selectedGroup.name}</CardTitle>
                <CardDescription>
                  Detailed view of the selected upload group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-600 text-sm">Status</p>
                    <Badge className={getStatusColor(selectedGroup.status)}>
                      {getStatusIcon(selectedGroup.status)}
                      <span className="ml-1">{selectedGroup.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 text-sm">
                      Progress
                    </p>
                    <div className="w-32">
                      <Progress
                        className="h-2"
                        value={calculateGroupProgress(selectedGroup)}
                      />
                      <span className="text-gray-500 text-xs">
                        {selectedGroup.completedFiles}/
                        {selectedGroup.totalFiles} files
                      </span>
                    </div>
                  </div>
                </div>

                {selectedGroup.sessions &&
                  selectedGroup.sessions.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium">
                        Sessions in this group:
                      </h4>
                      <div className="space-y-2">
                        {selectedGroup.sessions.map((session) => (
                          <div
                            className="flex items-center justify-between rounded border p-2"
                            key={session.id}
                          >
                            <div>
                              <p className="font-medium">
                                {session.objectKey.split("/").pop()}
                              </p>
                              <p className="text-gray-500 text-sm">
                                ID: {session.id}
                              </p>
                            </div>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {selectedSession && (
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  Detailed view of the selected upload session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-600 text-sm">File</p>
                    <p>{selectedSession.objectKey.split("/").pop()}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 text-sm">Status</p>
                    <Badge className={getStatusColor(selectedSession.status)}>
                      {getStatusIcon(selectedSession.status)}
                      <span className="ml-1">{selectedSession.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 text-sm">
                      Upload Type
                    </p>
                    <Badge variant="outline">
                      {selectedSession.totalParts ? "Multipart" : "Direct"}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 text-sm">
                      Uploaded At
                    </p>
                    <p className="text-sm">
                      {selectedSession.uploadedAt
                        ? formatDate(selectedSession.uploadedAt)
                        : "Pending"}
                    </p>
                  </div>
                </div>

                {selectedSession.parts && selectedSession.parts.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">
                      Parts ({selectedSession.parts.length}):
                    </h4>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {selectedSession.parts.map((part) => (
                        <div
                          className="flex items-center justify-between rounded border p-2 text-sm"
                          key={part.partNumber}
                        >
                          <span>Part {part.partNumber}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatFileSize(part.size)}</span>
                            <Badge
                              className={`${getStatusColor(part.status)} text-white`}
                              variant="outline"
                            >
                              {part.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!(selectedGroup || selectedSession) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">
                  Select a group or session to view details
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
