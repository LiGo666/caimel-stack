"use server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { ApiResponse } from "@/features/secureApi";
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent";
import {
  createPath,
  deletePath,
  getAllPaths,
  getPathById,
  getPathByPath,
  updatePath,
  validatePassphrase,
} from "../lib/managePathPassphrases";
import {
  createPathPassphraseSchema,
  deletePathSchema,
  getPathByIdSchema,
  getPathByPathSchema,
  updatePathPassphraseSchema,
  validatePassphraseSchema,
} from "../schema/passphraseZodSchema";
/**
 * Server action to create a new path with passphrases
 */
export async function createPathAction(data: unknown): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = createPathPassphraseSchema.parse(data);
    const result = await createPath(parsedData);
    return { success: true, data: result };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to get a path by ID
 */
export async function getPathByIdAction(data: unknown): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = getPathByIdSchema.parse(data);
    const result = await getPathById(parsedData);
    if (!result) {
      return {
        success: false,
        toastTitle: t("pathNotFound"),
        toastType: "error",
      };
    }
    return {
      success: true,
      data: result,
      toastTitle: t("pathRetrieved"),
      toastType: "success",
    };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to get a path by path string
 */
export async function getPathByPathAction(data: unknown): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = getPathByPathSchema.parse(data);
    const result = await getPathByPath(parsedData);
    if (!result) {
      return {
        success: false,
        toastTitle: t("pathNotFound"),
        toastDescription: t("pathNotFound"),
        toastType: "error",
      };
    }
    return { success: true, data: result };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: t("validationFailed"),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to update passphrases for a path
 */
export async function updatePathAction(data: unknown): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = updatePathPassphraseSchema.parse(data);
    const result = await updatePath(parsedData);
    return { success: true, data: result };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: t("validationFailed"),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to delete a path
 */
export async function deletePathAction(data: unknown): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = deletePathSchema.parse(data);
    const result = await deletePath(parsedData);
    return { success: true, data: result };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: t("validationFailed"),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to validate a passphrase for a path
 */
export async function validatePassphraseAction(
  data: unknown
): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const parsedData = validatePassphraseSchema.parse(data);
    const isValid = await validatePassphrase(parsedData);
    return { success: true, data: { isValid } };
  } catch (error) {
    const t = await getTranslations("features.secure-api");
    if (error instanceof z.ZodError) {
      return {
        success: false,
        toastTitle: t("validationFailed"),
        toastDescription: t("validationFailed"),
        toastType: "error",
      };
    }
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}

/**
 * Server action to get all paths
 */
export async function getAllPathsAction(): Promise<ApiResponse> {
  try {
    const t = await getTranslations("features.secure-api");
    const result = await getAllPaths();
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    const t = await getTranslations("features.secure-api");
    return unexpectedErrorToastContent(t, "ERROR-123456");
  }
}
