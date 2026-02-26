import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const email = user.email.toLowerCase();

      // Check env whitelist first
      const envEmails = (process.env.APPROVED_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (envEmails.includes(email)) return true;

      // Check database whitelist
      try {
        const allowed = await prisma.allowedEmail.findUnique({
          where: { email },
        });
        return !!allowed;
      } catch (err) {
        console.error("DB whitelist check failed:", err);
        // If DB is unreachable, fall back to env-only whitelist
        return false;
      }
    },
    async session({ session }) {
      return session;
    },
  },
});
