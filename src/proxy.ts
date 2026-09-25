import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ============================================================
// src/proxy.ts — Edge & Node Route Protection & Authentication Guard
// Migrasi konvensi Next.js 16 (pengganti middleware.ts yang deprecated)
// Sesuai ARCHITECTURE.md § 3.2 & SECURITY.md
// ============================================================

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/new-project") ||
    pathname.startsWith("/project");

  // Jika pengguna sudah terautentikasi dan mencoba mengakses halaman login/register,
  // alihkan langsung ke /dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Jika belum login dan mencoba mengakses rute privat,
  // alihkan langsung ke /login dengan callbackUrl yang sesuai
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new-project/:path*",
    "/project/:path*",
    "/login",
    "/register",
  ],
};

export default proxy;
