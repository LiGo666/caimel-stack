"use client";

import { useCallback, useEffect } from "react";
import { toast } from "../components/Toast";

// HTTP Status Constants
const HTTP_STATUS = {
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * Helper function to extract retry-after value from error or response
 */
function extractRetryAfter(error: Record<string, unknown>): number | undefined {
  if ("retryAfter" in error) {
    return Number(error.retryAfter);
  }

  if ("headers" in error && error.headers instanceof Headers) {
    const retryHeader = error.headers.get("retry-after");
    return retryHeader ? Number(retryHeader) : undefined;
  }
}

/**
 * Helper function to format retry time in a human-readable format
 */
function formatRetryTime(seconds: number): string {
  return seconds >= 60 
    ? `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) !== 1 ? 's' : ''}` 
    : `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Check if a status code is one we want to handle
 */
function isHandledStatusCode(status: number): status is HttpStatusCode {
  return Object.values(HTTP_STATUS).includes(status as HttpStatusCode);
}

/**
 * Hook to detect and handle common HTTP errors from fetch requests
 * Automatically shows appropriate toast notifications based on the error type
 */
export function useHttpErrorHandler() {
  // Function to show appropriate error toast based on status code
  const showErrorToast = useCallback((status: number, retryAfter?: number) => {
    switch (status) {
      case HTTP_STATUS.NOT_FOUND:
        toast.Error("Resource not found", {
          description: "The requested resource could not be found. Please check the URL and try again.",
          dismissible: true
        });
        break;
      
      case HTTP_STATUS.RATE_LIMIT:
        toast.Error("Rate limit exceeded", {
          description: `Please try again later${retryAfter ? ` after ${formatRetryTime(retryAfter)}` : '.'}`,
          dismissible: true
        });
        break;
      
      case HTTP_STATUS.SERVER_ERROR:
        toast.Error("Server error", {
          description: "The server encountered an error. Please try again later.",
          dismissible: true
        });
        break;
      
      case HTTP_STATUS.BAD_GATEWAY:
        toast.Error("Bad gateway", {
          description: "The server received an invalid response. Please try again later.",
          dismissible: true
        });
        break;
      
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        toast.Error("Service unavailable", {
          description: "The service is temporarily unavailable. Please try again later.",
          dismissible: true
        });
        break;
      
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        toast.Error("Gateway timeout", {
          description: "The server timed out. Please try again later.",
          dismissible: true
        });
        break;
      
      default:
        toast.Error("Request failed", {
          description: "An error occurred while processing your request. Please try again.",
          dismissible: true
        });
        break;
    }
  }, []);
  
  // Handle network errors (timeout, connection refused, etc.)
  const handleNetworkError = useCallback((errorObj: Record<string, unknown>): boolean => {
    if ("name" in errorObj && errorObj.name === "TypeError" && "message" in errorObj) {
      const message = String(errorObj.message).toLowerCase();
      if (message.includes("timeout") || message.includes("network") || message.includes("failed to fetch")) {
        toast.Error("Network error", {
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          dismissible: true
        });
        return true;
      }
    }
    return false;
  }, []);

  // Function to handle HTTP errors from objects
  const handleHttpError = useCallback((error: unknown): boolean => {
    // Check if the error is an HTTP error
    if (!error || typeof error !== "object") {
      return false;
    }

    const errorObj = error as Record<string, unknown>;
    
    // Check for status code errors
    if ("status" in errorObj && typeof errorObj.status === "number") {
      const status = errorObj.status as number;
      
      if (isHandledStatusCode(status)) {
        const retryAfter = status === HTTP_STATUS.RATE_LIMIT ? extractRetryAfter(errorObj) : undefined;
        showErrorToast(status, retryAfter);
        return true;
      }
    }
    
    // Check for network errors
    return handleNetworkError(errorObj);
  }, [showErrorToast, handleNetworkError]);

  // Function to handle HTTP error responses
  const handleErrorResponse = useCallback(async (response: Response) => {
    const status = response.status;
    
    // Only handle specific HTTP error statuses
    if (!isHandledStatusCode(status)) {
      return;
    }
    
    // Clone the response to read it without consuming it
    const clonedResponse = response.clone();
    let retryAfter: number | undefined;
    
    if (status === HTTP_STATUS.RATE_LIMIT) {
      try {
        // Try to parse the response as JSON
        const data = await clonedResponse.json();
        retryAfter = extractRetryAfter({
          ...data,
          status: HTTP_STATUS.RATE_LIMIT,
          headers: response.headers
        });
      } catch (_) {
        // If response is not JSON, just use the headers
        retryAfter = extractRetryAfter({
          status: HTTP_STATUS.RATE_LIMIT,
          headers: response.headers
        });
      }
    }
    
    showErrorToast(status, retryAfter);
  }, [showErrorToast]);

  // Set up fetch interception
  useEffect(() => {
    const originalFetch = window.fetch;
    
    // Create interceptor function
    const fetchInterceptor = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const response = await originalFetch(input, init);
        await handleErrorResponse(response);
        return response;
      } catch (error) {
        // Handle network errors or other fetch failures
        if (error && typeof error === "object") {
          handleHttpError(error);
        }
        throw error;
      }
    };
    
    // Replace fetch with interceptor
    window.fetch = fetchInterceptor;
    
    // Also keep the global error handler for other types of errors
    const handleError = (event: ErrorEvent) => {
      if (event.error && typeof event.error === "object") {
        const isHandled = handleHttpError(event.error);
        if (isHandled) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError);
    };
  }, [handleHttpError, handleErrorResponse]);

  return { handleHttpError };
}
