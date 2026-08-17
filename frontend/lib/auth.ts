import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import clientPromise, { DB_NAME } from "@/lib/db";
import type { Role } from "@/lib/roles";
export type { Role, StaffRole } from "@/lib/roles";
export { ROLES, STAFF_ROLES, isStaffRole, canAccessBilling } from "@/lib/roles";

const baseAdapter = MongoDBAdapter(clientPromise, { databaseName: DB_NAME });
const baseCreateUser = baseAdapter.createUser!;

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(user) {
    const created = await baseCreateUser(user);
    const client = await clientPromise;
    await client
      .db(DB_NAME)
      .collection("users")
      .updateOne({ email: created.email }, { $set: { role: "doctor" } });
    return { ...created, role: "doctor" as Role };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
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
        token.role = ((user as { role?: string }).role ?? "doctor") as Role;
      }
      // Keep the token (sidebar avatar, header) in sync with the latest
      // profile data stored in the database.
      if (token.id) {
        try {
          const client = await clientPromise;
          const doc = await client
            .db(DB_NAME)
            .collection("users")
            .findOne(
              { _id: new ObjectId(token.id as string) },
              { projection: { name: 1, image: 1, role: 1 } }
            );
          if (doc) {
            token.name = doc.name ?? token.name;
            token.image = doc.image ?? null;
            if (doc.role) token.role = doc.role as Role;
          }
        } catch {
          // Keep existing token values if the refresh fails.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "doctor";
        session.user.image = (token.image as string | null) ?? null;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
