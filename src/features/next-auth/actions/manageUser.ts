"use server"

import { getUserByEmail, getUserById, updateUser } from "../lib/manageUsers"
import * as z from "zod"
import { assertRatelimit } from "@/features/secureApi"
import { ApiResponse } from "@/features/secureApi"
import { getTranslations } from "next-intl/server"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"
import { getServerSession } from "next-auth"
import { authOptions } from "@/features/next-auth"

// Define schemas for user profile operations
const userProfileSchema = z.object({ name: z.string().min(1).optional(), email: z.email().optional() })

export type UserProfileUpdateInput = z.infer<typeof userProfileSchema>

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(): Promise<ApiResponse<any>> {
   const t = await getTranslations("features.next-auth")
   const tGeneric = await getTranslations("generic")

   try {
      // Check rate limit before proceeding
      const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      // Get current session
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
         return {
            success: false,
            toastTitle: t("errors.notAuthenticated.title"),
            toastDescription: t("errors.notAuthenticated.description"),
            toastType: "error",
         }
      }

      // Get user from database
      const user = await getUserByEmail(session.user.email)
      if (!user) {
         return {
            success: false,
            toastTitle: t("errors.userNotFound.title"),
            toastDescription: t("errors.userNotFound.description"),
            toastType: "error",
         }
      }

      // Return sanitized user data (remove sensitive fields)
      const { accounts, ...userData } = user
      return { success: true, data: userData, toastType: "success" }
   } catch (error) {
      console.error("===== GET_USER_PROFILE_ERROR_100003 =====")
      console.error("Error type:", error.constructor.name)
      console.error("Full error:", JSON.stringify(error, null, 2))

      return unexpectedErrorToastContent(tGeneric, "ERROR-654232")
   }
}

/**
 * Update the current user's profile
 */
export async function updateCurrentUserProfile(input: UserProfileUpdateInput): Promise<ApiResponse<any>> {
   const t = await getTranslations("features.next-auth")
   const tGeneric = await getTranslations("generic")

   try {
      // Check rate limit before proceeding
      const rateLimitResult = await assertRatelimit("SECURE_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      // Get current session
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
         return {
            success: false,
            toastTitle: t("errors.notAuthenticated.title"),
            toastDescription: t("errors.notAuthenticated.description"),
            toastType: "error",
         }
      }

      // Validate input
      const validated = userProfileSchema.safeParse(input)
      if (!validated.success) {
         return { success: false, toastTitle: t("errors.validation.title"), toastDescription: t("errors.validation.description"), toastType: "error" }
      }

      // Get user from database
      const user = await getUserByEmail(session.user.email)
      if (!user) {
         return {
            success: false,
            toastTitle: t("errors.userNotFound.title"),
            toastDescription: t("errors.userNotFound.description"),
            toastType: "error",
         }
      }

      // If updating email, check if it's already taken
      if (input.email && input.email !== user.email) {
         const existingUser = await getUserByEmail(input.email)
         if (existingUser) {
            return {
               success: false,
               toastTitle: t("errors.emailTaken.title"),
               toastDescription: t("errors.emailTaken.description"),
               toastType: "error",
            }
         }
      }

      // Update user
      const updatedUser = await updateUser(user.id, validated.data)

      return {
         success: true,
         data: updatedUser,
         toastTitle: t("profile.updateSuccess.title"),
         toastDescription: t("profile.updateSuccess.description"),
         toastType: "success",
      }
   } catch (error) {
      console.error("===== UPDATE_USER_PROFILE_ERROR_100004 =====")
      console.error("Error type:", error.constructor.name)
      console.error("Full error:", JSON.stringify(error, null, 2))

      return unexpectedErrorToastContent(tGeneric, "ERROR-654245")
   }
}
