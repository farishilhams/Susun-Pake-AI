// ============================================================
// lib/auth.ts — NextAuth.js Config & Authentication Helpers
// Sesuai ARCHITECTURE.md § 4 & SECURITY.md
// Single Source of Truth untuk Konfigurasi Autentikasi Aplikasi
// ============================================================

import { AuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { ApiResponse } from "@/types";

export const authOptions: AuthOptions = {
  providers: [
    // 1. Google OAuth 2.0 Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // 2. Email + Password (Credentials) Provider
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const cleanEmail = credentials.email.toLowerCase().trim();

        await connectDB();

        // 1. Query eksplisit ke MongoDB Atlas (.lean())
        const user = await User.findOne({ email: cleanEmail }).lean();

        // Cegah bypass jika user tidak ada atau belum punya passwordHash (Google user)
        if (!user || !user.passwordHash) {
          return null;
        }

        // Verifikasi kata sandi dengan bcryptjs
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        // Pastikan URL foto profil (image / avatar_url / avatarUrl) diambil secara lengkap
        const resolvedImage =
          user.image ||
          user.avatar_url ||
          user.avatarUrl ||
          (user.avatarData
            ? `/api/user/avatar?u=${user._id.toString()}&v=${(user as any).updatedAt ? new Date((user as any).updatedAt).getTime() : 1}`
            : null);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: resolvedImage,
          avatar_url: resolvedImage,
          avatarUrl: resolvedImage,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],

  // JWT strategy — stateless, cocok untuk serverless (Vercel)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },

  callbacks: {
    // Saat sign in: simpan/update user di MongoDB Atlas
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (account?.provider === "google") {
        try {
          await connectDB();
          const googleId = profile?.sub ?? account.providerAccountId;
          const email = user.email?.trim().toLowerCase();

          if (!email) return false;

          let existingUser = await User.findOne({
            $or: [{ googleId }, { email }],
          });

          const googleAvatar = (profile as any)?.picture || user.image || null;

          if (existingUser) {
            existingUser.googleId = googleId;
            // Jika user belum pernah upload avatar manual (avatarData), sinkronkan dengan avatar Google
            if (!existingUser.avatarData && googleAvatar) {
              existingUser.avatarUrl = googleAvatar;
              existingUser.image = googleAvatar;
              existingUser.avatar_url = googleAvatar;
            }
            if (!existingUser.name && user.name) {
              existingUser.name = user.name;
            }

            // Pertahankan passwordHash asli, upgrade authProvider ke both jika sudah punya password
            if (existingUser.passwordHash) {
              existingUser.authProvider = "both";
            } else {
              existingUser.authProvider = "google";
            }

            await existingUser.save();
          } else {
            await User.create({
              email,
              googleId,
              name: user.name ?? "Pengguna",
              avatarUrl: googleAvatar,
              image: googleAvatar,
              avatar_url: googleAvatar,
              authProvider: "google",
              sessionVersion: 0,
            });
          }

          return true;
        } catch (error) {
          console.error("Error saving Google user to DB:", error);
          return false;
        }
      }

      return false;
    },

    // Tambahkan userId, sessionVersion, name, & avatar ke JWT token
    async jwt({ token, user, account, profile, trigger, session }) {
      // 1. Saat inisiasi sign in pertama (baik Google maupun Credentials)
      if (user) {
        token.id = user.id;
        token.userId = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.name = user.name;
        token.email = user.email;
        const userAvatar =
          user.image ||
          (user as any).avatar_url ||
          (user as any).avatarUrl ||
          null;
        if (userAvatar) {
          token.picture = userAvatar;
        }
      }

      // 2. Tangani pemicu update session di client (useSession().update({ name, image }))
      if (trigger === "update" && session) {
        if (session.name) {
          token.name = session.name;
        }
        const updatedImg =
          session.image !== undefined
            ? session.image
            : (session as any).avatar_url !== undefined
            ? (session as any).avatar_url
            : session.avatarUrl;

        if (updatedImg) {
          if (typeof updatedImg === "string" && updatedImg.startsWith("data:image/")) {
            const targetId = token.userId || token.id;
            token.picture = `/api/user/avatar?u=${targetId}&v=${Date.now()}`;
          } else {
            token.picture = updatedImg;
          }
        }
        return token;
      }

      // 3. Untuk sign in Google, pastikan userId sinkron dengan MongoDB _id & ambil avatar kustom jika ada
      if (
        account?.provider === "google" &&
        (profile?.sub || account.providerAccountId)
      ) {
        try {
          await connectDB();
          const googleId = profile?.sub ?? account.providerAccountId;
          const userEmail = (token.email || user?.email || "")
            .trim()
            .toLowerCase();
          const dbUser = await User.findOne({
            $or: [{ googleId }, ...(userEmail ? [{ email: userEmail }] : [])],
          }).lean();
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.userId = dbUser._id.toString();
            token.sessionVersion = dbUser.sessionVersion ?? 0;
            token.name = dbUser.name || token.name;
            const dbAvatar =
              dbUser.image ||
              dbUser.avatar_url ||
              dbUser.avatarUrl ||
              (dbUser.avatarData
                ? `/api/user/avatar?u=${dbUser._id.toString()}&v=${(dbUser as any).updatedAt ? new Date((dbUser as any).updatedAt).getTime() : 1}`
                : null);
            if (dbAvatar) {
              token.picture = dbAvatar;
            }
          }
        } catch (error) {
          console.error("Error fetching Google user for JWT:", error);
        }
      }

      // 4. Verifikasi sessionVersion & background token rotation (misal saat window refocus)
      // KUNCI: JANGAN PERNAH menimpa token.picture dengan null jika token sudah punya avatar!
      if ((token.userId || token.id) && !user) {
        try {
          await connectDB();
          const currentId = token.userId || token.id;
          const dbUser = await User.findById(currentId)
            .select("sessionVersion name avatarUrl image avatar_url")
            .lean();

          if (
            !dbUser ||
            (token.sessionVersion !== undefined &&
              dbUser.sessionVersion !== token.sessionVersion)
          ) {
            // Sesi telah diinvalidasi
            return {};
          }

          if (dbUser.name) {
            token.name = dbUser.name;
          }

          const dbAvatar =
            dbUser.image ||
            dbUser.avatar_url ||
            dbUser.avatarUrl ||
            null;

          // Hanya perbarui jika ada gambar valid di DB; JANGAN timpa token.picture menjadi null
          if (dbAvatar) {
            token.picture = dbAvatar;
          }
        } catch (err) {
          console.error("Error verifying session version in JWT:", err);
        }
      }

      return token;
    },

    // Expose userId, name, & image ke session object (accessible di client & server)
    async session({ session, token }) {
      if (session?.user) {
        const userId = (token.userId || token.id) as string;
        session.user.id = userId;
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        const userPic = (token.picture as string) || null;
        session.user.image = userPic;
        session.user.avatarUrl = userPic;
        session.user.avatar_url = userPic;
      }
      return session;
    },

    // Redirect callback: Normalisasi rute pengalihan pasca-login (default ke beranda /)
    async redirect({ url, baseUrl }) {
      if (!url) {
        return baseUrl;
      }

      const sanitizedUrl = url.split("#")[0].trim();

      if (!sanitizedUrl || sanitizedUrl === "/" || sanitizedUrl === baseUrl) {
        return baseUrl;
      }

      if (sanitizedUrl.startsWith("/")) {
        if (
          sanitizedUrl.startsWith("/login") ||
          sanitizedUrl.startsWith("/register")
        ) {
          return baseUrl;
        }
        return `${baseUrl}${sanitizedUrl}`;
      }

      try {
        const parsed = new URL(sanitizedUrl);
        if (parsed.origin === baseUrl) {
          const pathname = parsed.pathname;
          if (
            !pathname ||
            pathname === "/" ||
            pathname.startsWith("/login") ||
            pathname.startsWith("/register")
          ) {
            return baseUrl;
          }
          return `${baseUrl}${pathname}${parsed.search}`;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};

export type AuthenticatedSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
  };
};

/**
 * Ambil session terautentikasi dari NextAuth.
 * Return null jika user belum login.
 */
export async function getAuthSession(): Promise<AuthenticatedSession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) return null;
  if (!session.user.id) return null;

  return session as AuthenticatedSession;
}

/**
 * Require authentication — return 401 response jika tidak login.
 * Dipakai di awal setiap API route yang butuh auth.
 */
export async function requireAuth(): Promise<
  AuthenticatedSession | NextResponse<ApiResponse>
> {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        data: null,
        message: "Unauthorized — silakan login terlebih dahulu",
      },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Type guard: cek apakah return value dari requireAuth adalah session
 */
export function isSession(
  result: AuthenticatedSession | NextResponse<ApiResponse>
): result is AuthenticatedSession {
  return "user" in result;
}
