import { FileStore } from "@tus/file-store";
import { Server } from "@tus/server";
import type { NextRequest } from "next/server";

const server = new Server({
  // `path` needs to match the route declared by the next file router
  // ie /api/upload
  path: "/api/upload",
  datastore: new FileStore({ directory: "./files" }),
});

export const GET = async (req: NextRequest) => server.handleWeb(req);
export const PATCH = async (req: NextRequest) => server.handleWeb(req);
export const POST = async (req: NextRequest) => server.handleWeb(req);
export const DELETE = async (req: NextRequest) => server.handleWeb(req);
export const OPTIONS = async (req: NextRequest) => server.handleWeb(req);
export const HEAD = async (req: NextRequest) => server.handleWeb(req);
