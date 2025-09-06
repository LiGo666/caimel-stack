import { PrismaClient } from "@/repository/prisma/generated"
import {
   CreatePathPassphraseInput,
   UpdatePathPassphraseInput,
   GetPathByIdInput,
   GetPathByPathInput,
   DeletePathInput,
   ValidatePassphraseInput,
} from "../schema/passphraseZodSchema"

const prisma = new PrismaClient()

/**
 * Creates a new path with associated passphrases
 * @param input - Data for creating a new path
 * @returns The created path object
 */
export async function createPath(input: CreatePathPassphraseInput) {
   return prisma.path.create({ data: { path: input.path, passphrases: input.passphrases } })
}

/**
 * Retrieves a path by its ID
 * @param input - ID of the path to retrieve
 * @returns The path object if found, null otherwise
 */
export async function getPathById(input: GetPathByIdInput) {
   return prisma.path.findUnique({ where: { id: input.id } })
}

/**
 * Retrieves a path by its path string
 * @param input - Path string to search for
 * @returns The path object if found, null otherwise
 */
export async function getPathByPath(input: GetPathByPathInput) {
   return prisma.path.findUnique({ where: { path: input.path } })
}

/**
 * Updates passphrases for an existing path
 * @param input - Data for updating the path
 * @returns The updated path object
 */
export async function updatePath(input: UpdatePathPassphraseInput) {
   return prisma.path.update({ where: { id: input.id }, data: { passphrases: input.passphrases } })
}

/**
 * Deletes a path by its ID
 * @param input - ID of the path to delete
 * @returns The deleted path object
 */
export async function deletePath(input: DeletePathInput) {
   return prisma.path.delete({ where: { id: input.id } })
}

/**
 * Validates a passphrase for a given path
 * @param input - Path and passphrase to validate
 * @returns True if the passphrase is valid for the path, false otherwise
 */
export async function validatePassphrase(input: ValidatePassphraseInput): Promise<boolean> {
   const path = await prisma.path.findUnique({ where: { path: input.path } })

   if (!path) {
      return false
   }

   return path.passphrases.includes(input.passphrase)
}

/**
 * Retrieves all paths
 * @returns Array of all path objects
 */
export async function getAllPaths() {
   return prisma.path.findMany()
}
