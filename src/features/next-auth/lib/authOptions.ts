import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { env } from "@/features/env"

declare module "next-auth" {
   interface User {
      id: string
   }
   interface Session {
      user: { id: string; name?: string; email?: string; image?: string }
   }
}

export const authOptions: AuthOptions = {
   providers: [
      CredentialsProvider({
         name: "Credentials",
         credentials: { username: { label: "Username", type: "text" }, password: { label: "Password", type: "password" } },
         async authorize(credentials) {
            if (!credentials?.username || !credentials?.password) return null

            // Validate against admin credentials from environment variables
            if (credentials.username === env.ADMIN_USERNAME && credentials.password === env.ADMIN_PASSWORD) {
               return { id: "admin", name: env.ADMIN_USERNAME, email: env.ADMIN_USERNAME }
            }

            return null
         },
      }),
   ],
   // Use custom app routes for auth pages
   pages: { signIn: "/admin/auth/signin", signOut: "/admin/auth/signout" },
   session: { strategy: "jwt" },
   secret: env.NEXTAUTH_SECRET,
   callbacks: {
      jwt({ token, user }) {
         if (user) {
            token.id = user.id
         }
         return token
      },
      session({ session, token }) {
         if (token) {
            session.user.id = token.id as string
         }
         return session
      },
   },
}
