import NextAuth from "next-auth";
import { authOptionsPassword } from "@/features/next-auth";

const handler = NextAuth(authOptionsPassword);
export { handler as GET, handler as POST };
