import { PrismaClient } from "@/repository/prisma"
import bcrypt from "bcrypt"

// Initialize Prisma client
const prisma = new PrismaClient()

/**
 * Get a user by ID
 */
export async function getUserById(id: string) {
   return prisma.user.findUnique({ where: { id } })
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string) {
   return prisma.user.findUnique({ where: { email } })
}

/**
 * Create a new user
 */
export async function createUser(data: { email: string; name: string; password: string }) {
   const { email, name, password } = data

   const passwordHash = await bcrypt.hash(password, 10)

   return prisma.user.create({ data: { email, name, password: passwordHash } })
}

/**
 * Update a user
 */
export async function updateUser(id: string, data: { email?: string; name?: string }) {
   return prisma.user.update({ where: { id }, data })
}

/**
 * Delete a user
 */
export async function deleteUser(id: string) {
   return prisma.user.delete({ where: { id } })
}

/**
 * Update user's password
 */
export async function updateUserPassword(userId: string, passwordHash: string) {
   return prisma.user.update({ where: { id: userId }, data: { password: passwordHash } })
}
