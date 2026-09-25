// ============================================================
// types/next-auth.d.ts — NextAuth Type Augmentation
// Extend NextAuth Session & JWT types untuk menambahkan userId & sessionVersion
// Solusi permanen agar type-safe di seluruh aplikasi
// ============================================================

import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
    interface Session {
    user: {
      id: string;
      sessionVersion?: number;
      avatarUrl?: string | null;
      avatar_url?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    sessionVersion?: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    sessionVersion?: number;
    picture?: string | null;
  }
}

