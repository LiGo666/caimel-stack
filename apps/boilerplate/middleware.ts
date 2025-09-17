import { HTTP_STATUS } from "@features/nextjs/config/constants";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isRateLimited } from "./lib/ratelimiter";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const isServerAction =
    request.method === "POST" && request.headers.get("next-action");

  if (isServerAction) {
    try {
      const actionName =
        request.headers.get("next-action") ||
        request.nextUrl.pathname.split("/").pop() ||
        "unknown-action";

      const rateLimitResult = await isRateLimited(request, actionName);

      if (rateLimitResult === true) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: HTTP_STATUS.RATE_LIMIT }
        );
      }
    } catch (_error) {
      return NextResponse.json(
        { error: "Server error" },
        { status: HTTP_STATUS.SERVER_ERROR }
      );
    }
  }

  return response;
}

// Only run middleware on paths that aren't static files, api routes, or other special paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes
     * - /_next or /next internal paths
     * - /_vercel or /vercel internal paths
     */
    "/((?!_next/static|_next/image|favicon\\.ico|public/|api/|_next/|_vercel/|vercel/).*)",
  ],
};
