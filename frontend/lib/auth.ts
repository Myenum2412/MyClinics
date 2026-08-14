import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import clientPromise, { DB_NAME } from "@/lib/db";
import type { Role } from "@/lib/roles";
export type { Role, StaffRole } from "@/lib/roles";
export { ROLES, STAFF_ROLES, isStaffRole, canAccessBilling } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, { databaseName: DB_NAME }),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const client = await clientPromise;
        const users = client.db(DB_NAME).collection("users");
        const user = await users.findOne({ email: email.toLowerCase() });

        if (!user || typeof user.password !== "string") return null;
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          role: user.role as Role | undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = ((user as { role?: string }).role ?? "patient") as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "patient";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
