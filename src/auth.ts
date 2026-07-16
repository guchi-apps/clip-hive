import { headers } from "next/headers";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { notifySignalyLogin } from "@/lib/signaly";

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  events: {
    async signIn({ user }) {
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headersList.get("x-real-ip");
      await notifySignalyLogin({ email: user.email ?? null, ip });
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
