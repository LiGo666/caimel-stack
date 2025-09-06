import { passwordMinChars } from "../config/credentials"
import { z } from "zod"

/**
 * Type for translation functions from either client or server
 */
export type TranslationFunction = (key: string, params?: Record<string, unknown>) => string

/**
 * Base schema definitions
 */

/**
 * User credentials (sign-in)
 */
export const createCredentialsSchema = (t?: TranslationFunction) =>
   z.object({
      username: z.string().min(1, t ? t("validation.errors.usernameRequired") : "Username is required"),
      password: z.string().min(1, t ? t("validation.errors.passwordRequired") : "Password is required"),
   })

/**
 * Base profile schema (for forms and full profile data)
 */
const createBaseProfileSchema = (t?: TranslationFunction) =>
   z.object({
      name: z.string().min(1, t ? t("validation.errors.nameRequired") : "Name is required"),
      email: z.email(t ? t("validation.errors.emailInvalid") : "Invalid email address"),
   })

/**
 * User profile schema for updates (with optional fields)
 */
export const createUserProfileSchema = (t?: TranslationFunction) => createBaseProfileSchema(t).partial()

/**
 * Profile form schema (all fields required for form validation)
 */
export const createProfileFormSchema = (t?: TranslationFunction) => createBaseProfileSchema(t)

/**
 * User registration - base schema shared by server and form
 */
export const createRegistrationSchema = (t?: TranslationFunction) =>
   z.object({
      email: z.email(t ? t("validation.errors.emailInvalid") : "Invalid email address"),
      name: z.string().min(1, t ? t("validation.errors.nameRequired") : "Name is required"),
      password: z
         .string()
         .min(
            passwordMinChars,
            t ? t("validation.errors.passwordMin", { min: passwordMinChars }) : `Password must be at least ${passwordMinChars} characters`,
         ),
   })

/**
 * Registration form - extends base registration schema with password confirmation
 */
export const createRegistrationFormSchema = (t?: TranslationFunction) => {
   // Create the base schema first
   const baseSchema = createRegistrationSchema(t)

   // Extend with confirmPassword
   return baseSchema
      .extend({ confirmPassword: z.string().min(1, t ? t("validation.errors.confirmPasswordRequired") : "Please confirm your password") })
      .refine((data) => data.password === data.confirmPassword, {
         message: t ? t("validation.errors.passwordsNotMatch") : "Passwords do not match",
         path: ["confirmPassword"],
      })
}

// Type exports
export type CredentialsInput = z.infer<ReturnType<typeof createCredentialsSchema>>
export type UserProfileUpdateInput = z.infer<ReturnType<typeof createUserProfileSchema>>
export type RegistrationInput = z.infer<ReturnType<typeof createRegistrationSchema>>
export type RegistrationFormInput = z.infer<ReturnType<typeof createRegistrationFormSchema>>
export type ProfileFormInput = z.infer<ReturnType<typeof createProfileFormSchema>>

// For backward compatibility
export const credentialsSchema = createCredentialsSchema()
export const userProfileSchema = createUserProfileSchema()
export const registrationSchema = createRegistrationSchema()
export const registrationFormSchema = createRegistrationFormSchema()
export const profileFormSchema = createProfileFormSchema()
