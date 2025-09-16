"use server";

import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import {
  getPathByPath,
  validatePassphrase,
} from "@/features/secureApi/lib/managePathPassphrases";

// Configuration variables
const CONFIG = {
  NUMBERS: [1, 2, 3, 4, 5],
  JWT_SECRET: new TextEncoder().encode(process.env.NEXTAUTH_SECRET || " "),
  JWT_EXPIRY: "24h",
  COOKIE_NAME: "pass-authenticated",
  COOKIE_MAX_AGE: 60 * 60 * 24, // 24 hours
  DEFAULT_PATH: "/pass/enter",
};

// Check if user is authenticated via JWT
export async function checkAuthentication() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(CONFIG.COOKIE_NAME);

  if (!authCookie?.value) {
    return false;
  }

  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(authCookie.value, CONFIG.JWT_SECRET);
    return payload.authenticated === true;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return false;
  }
}

// Create JWT token and set authentication cookie
async function setAuthCookie(path: string) {
  // Create a JWT token
  const token = await new SignJWT({ authenticated: true, path })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(CONFIG.JWT_EXPIRY)
    .sign(CONFIG.JWT_SECRET);

  // Set the cookie with the JWT token
  const cookieStore = await cookies();
  cookieStore.set(CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CONFIG.COOKIE_MAX_AGE,
  });
}

// Get the current path from the request headers
async function getCurrentPath(): Promise<string> {
  const headersList = await headers();

  // Try to get path from referer header
  const referer = headersList.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.pathname;
    } catch (error) {
      console.error("Failed to parse referer URL:", error);
    }
  }

  // Try to get path from x-url header (may be set by middleware or proxy)
  const xUrl = headersList.get("x-url");
  if (xUrl) {
    try {
      const url = new URL(xUrl);
      return url.pathname;
    } catch (error) {
      console.error("Failed to parse x-url:", error);
    }
  }

  // Fallback to default path
  return CONFIG.DEFAULT_PATH;
}

// Server action that returns array of numbers with auth check
export async function getNumbers(passphrase?: string) {
  try {
    const isAuthenticated = await checkAuthentication();

    // If already authenticated, return the numbers
    if (isAuthenticated) {
      return { authenticated: true, numbers: CONFIG.NUMBERS };
    }

    // If no passphrase provided, return unauthenticated
    if (!passphrase) {
      return { authenticated: false, numbers: [] };
    }

    // Get the current path and check if it exists in the database
    const currentPath = await getCurrentPath();

    try {
      const pathExists = await getPathByPath({ path: currentPath });

      // If path doesn't exist in database, return unauthenticated
      if (!pathExists) {
        console.log(`Path not found in database: ${currentPath}`);
        return { authenticated: false, numbers: [], path: currentPath };
      }

      // Validate the passphrase against the path
      const isValid = await validatePassphrase({
        path: currentPath,
        passphrase,
      });

      // If valid, set the authentication cookie with the path
      if (isValid) {
        await setAuthCookie(currentPath);
      }

      return {
        authenticated: isValid,
        numbers: isValid ? CONFIG.NUMBERS : [],
        message: isValid ? "Access granted" : "Invalid passphrase",
        path: currentPath,
      };
    } catch (dbError) {
      console.error(
        "Database error while validating path/passphrase:",
        dbError
      );
      return {
        authenticated: false,
        numbers: [],
        error: "Error validating credentials",
        path: currentPath,
      };
    }
  } catch (error) {
    console.error("Unexpected error in getNumbers:", error);
    return {
      authenticated: false,
      numbers: [],
      error: "An unexpected error occurred",
    };
  }
}
