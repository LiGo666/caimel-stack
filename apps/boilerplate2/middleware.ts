import type { NextRequest } from "next/server";
import {
  config as globalConfig,
  middleware as globalMiddleware,
} from "../../packages/features/nextjs/lib/middleware";

export async function middleware(request: NextRequest) {
  return await globalMiddleware(request);
}

export const config = globalConfig;
