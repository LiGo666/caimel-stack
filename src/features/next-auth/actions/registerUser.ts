"use server"

import { createUser, getUserByEmail } from "../lib/manageUsers"
import * as z from "zod"
import { assertRatelimit } from "@/features/secureApi"
import { ApiResponse } from "@/features/secureApi"
import { getTranslations } from "next-intl/server"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"

// Define the type based on expected shape, but create schema inside function
export type RegistrationInput = { email: string; name: string; password: string }

export async function registerUser(input: RegistrationInput): Promise<ApiResponse<any>> {
   const t = await getTranslations("features.next-auth")
   const tGeneric = await getTranslations("generic")

   try {
      // Create schema inside function to use translations
      const registrationSchema = z.object({
         email: z.email({ message: t("validation.errors.emailInvalid") }),
         name: z.string().min(1, { message: t("validation.errors.nameRequired") }),
         password: z.string().min(8, { message: t("validation.errors.passwordMin") }),
      })

      // Check rate limit before proceeding
      const rateLimitResult = await assertRatelimit("SECURE_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      // Validate input
      const validated = registrationSchema.safeParse(input)
      if (!validated.success) {
         return { success: false, toastTitle: t("errors.validation.title"), toastDescription: t("errors.validation.description"), toastType: "error" }
      }

      // Check if user already exists
      const existingUser = await getUserByEmail(validated.data.email)
      if (existingUser) {
         return { success: false, toastTitle: t("errors.userExists.title"), toastDescription: t("errors.userExists.description"), toastType: "error" }
      }

      const user = await createUser({ email: validated.data.email, name: validated.data.name, password: validated.data.password })

      return {
         success: true,
         data: { userId: user.id },
         toastTitle: t("success.title"),
         toastDescription: t("success.description"),
         toastType: "success",
      }
   } catch (error) {
      console.error("===== REGISTER_USER_ERROR_100002 =====")
      console.error("Error type:", error.constructor.name)
      console.error("Full error:", JSON.stringify(error, null, 2))

      return unexpectedErrorToastContent(tGeneric, "ERROR-643554")
   }
}
