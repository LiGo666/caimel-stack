import type { NextRequest, NextResponse } from "next/server";
import { ERROR_MESSAGES } from "../../../packages/features/nextjs/config/constants";

// Define toast message type for type safety
export type ToastMessage = {
  id?: string;
  title: string;
  description: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number; // Duration in milliseconds
};

// Cookie name constant
export const TOAST_COOKIE_NAME = "X-Toast-Messages";

// Predefined toast messages
export const PREDEFINED_TOASTS = {
  RATE_LIMIT: {
    title: "Rate Limit Exceeded",
    description: ERROR_MESSAGES.RATE_LIMIT,
    type: "error" as const,
    duration: 5000,
  },
  AUTH_NEEDED: {
    title: "Authentication Required",
    description: "Please sign in to continue.",
    type: "info" as const,
    duration: 10_000,
  },
  AUTH_NEEDED_ADMIN: {
    title: "Admin Access Required",
    description: "This action requires administrator privileges.",
    type: "warning" as const,
    duration: 10_000,
  },
};

/**
 * Parse toast messages from a string value
 * @internal
 */
function parseToastMessages(value: string | undefined): ToastMessage[] {
  if (!value) {
    return [];
  }
  
  try {
    return JSON.parse(value) as ToastMessage[];
  } catch (_) {
    return [];
  }
}

/**
 * Get toast messages from cookies
 * @internal
 */
function getToastMessages(request: NextRequest | NextResponse): ToastMessage[] {
  const cookie = request.cookies.get(TOAST_COOKIE_NAME);
  return parseToastMessages(cookie?.value);
}

/**
 * Set toast messages cookie on response
 * @internal
 */
function setToastCookie(response: NextResponse, messages: ToastMessage[]): void {
  if (messages.length === 0) {
    return;
  }
  
  response.cookies.set({
    name: TOAST_COOKIE_NAME,
    value: JSON.stringify(messages),
    path: "/",
    httpOnly: false, // Must be false so client can read it
    sameSite: "lax", // Allow cross-origin on same site
    maxAge: 30, // Short expiration to prevent stale messages
  });
}

/**
 * Handle toast messages - gets existing messages and adds a new one if provided
 * @internal
 */
function handleToastMessages(
  request: NextRequest | null,
  response: NextResponse,
  newMessage?: ToastMessage
): void {
  try {
    // Get existing messages from request or response
    let messages: ToastMessage[] = [];
    
    if (request) {
      // Get messages from request cookie
      messages = getToastMessages(request);
    } else {
      // Get messages from response cookie
      messages = getToastMessages(response);
    }
    
    // Add new message if provided
    if (newMessage) {
      newMessage.id = newMessage.id || generateToastId();
      messages.push(newMessage);
    }
    
    // Set the cookie with updated messages
    setToastCookie(response, messages);
  } catch (error) {
    // Silent fail in production
    if (process.env.NODE_ENV !== "production") {
      // biome-ignore lint: Necessary for debugging in development
      console.warn("Error handling toast messages", error);
    }
  }
}

/**
 * Simple function to add a toast message to the response
 * This provides a clean API for middleware
 * @param request - The incoming request
 * @param response - The response to modify
 * @param message - Toast message or predefined toast key
 */
export function popToastMessage(
  request: NextRequest,
  response: NextResponse,
  message?: ToastMessage | keyof typeof PREDEFINED_TOASTS
): void {
  // If message is a string key, use the predefined toast
  if (typeof message === "string" && message in PREDEFINED_TOASTS) {
    handleToastMessages(request, response, PREDEFINED_TOASTS[message as keyof typeof PREDEFINED_TOASTS]);
  } else {
    // Otherwise use the custom message object
    handleToastMessages(request, response, message as ToastMessage | undefined);
  }
}

/**
 * Generate a unique ID for toast messages
 */
function generateToastId(): string {
  // Constants for ID generation
  const RANDOM_STRING_BASE = 36;
  const RANDOM_STRING_START = 2;
  const RANDOM_STRING_LENGTH = 9;

  return `toast-${Date.now()}-${Math.random().toString(RANDOM_STRING_BASE).substring(RANDOM_STRING_START, RANDOM_STRING_LENGTH)}`;
}
