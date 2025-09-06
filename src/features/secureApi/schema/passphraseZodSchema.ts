import { z } from "zod"

// Base schema for path validation
export const pathSchema = z.object({ path: z.string().min(1, { message: "Path is required" }) })

// Schema for creating a new path with passphrases
export const createPathPassphraseSchema = pathSchema.extend({
   passphrases: z
      .array(z.string().min(8, { message: "Passphrase must be at least 8 characters" }))
      .min(1, { message: "At least one passphrase is required" }),
})

// Schema for updating passphrases for an existing path
export const updatePathPassphraseSchema = z.object({
   id: z.cuid({ message: "Invalid path ID" }),
   passphrases: z
      .array(z.string().min(8, { message: "Passphrase must be at least 8 characters" }))
      .min(1, { message: "At least one passphrase is required" }),
})

// Schema for retrieving a path by ID
export const getPathByIdSchema = z.object({ id: z.cuid({ message: "Invalid path ID" }) })

// Schema for retrieving a path by path string
export const getPathByPathSchema = pathSchema

// Schema for deleting a path
export const deletePathSchema = z.object({ id: z.string().cuid({ message: "Invalid path ID" }) })

// Schema for validating a passphrase for a path
export const validatePassphraseSchema = pathSchema.extend({ passphrase: z.string().min(1, { message: "Passphrase is required" }) })

// Types derived from schemas
export type CreatePathPassphraseInput = z.infer<typeof createPathPassphraseSchema>
export type UpdatePathPassphraseInput = z.infer<typeof updatePathPassphraseSchema>
export type GetPathByIdInput = z.infer<typeof getPathByIdSchema>
export type GetPathByPathInput = z.infer<typeof getPathByPathSchema>
export type DeletePathInput = z.infer<typeof deletePathSchema>
export type ValidatePassphraseInput = z.infer<typeof validatePassphraseSchema>
