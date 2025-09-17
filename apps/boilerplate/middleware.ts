import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { popToastMessage } from "./lib/toastMiddleware";

/**
 * Simple authentication check for demo purposes
 * In a real app, this would check session cookies, JWT tokens, etc.
 */
function isAuthenticated(request: NextRequest): boolean {
  // For demo purposes, check if auth cookie exists
  return request.cookies.has("auth-token");
}

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();

  // Handle different paths with appropriate toast messages
  if (request.nextUrl.pathname === "/test") {
    popToastMessage(request, response, {
      title: "Test Page Visited",
      description: "You've visited the test page!",
      type: "info",
      duration: 5000, // 5 seconds
    });
  }
  if (request.nextUrl.pathname === "/test" && !isAuthenticated(request)) {
    popToastMessage(request, response, "AUTH_NEEDED_ADMIN");
  }

  // Check if this is a server action call to test2
  if (request.nextUrl.pathname.startsWith("/test2")) {
    // Server actions are POST requests with specific headers
    const isServerAction =
      request.method === "POST" && request.headers.get("next-action");

    if (isServerAction) {
      // biome-ignore lint/suspicious/noConsole: <test>
      console.log("SERVER ACTION DETECTED - RATE LIMITED");
      
      // Create a response that blocks the server action with an error code
      // The client-side toast provider will handle displaying the appropriate message
      return NextResponse.json(
        { error: "Rate limit exceeded", errorCode: "RATE_LIMIT" },
        { status: 429 } // 429 Too Many Requests
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
