// ============================================================
// app/api/auth/github/connect/route.ts
// Menginisiasi alur OAuth GitHub untuk otorisasi repository
// Sesuai SECURITY.md: Scope minimal HANYA 'repo'
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { id: userId } = authResult.user;
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") || "/dashboard";

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    const errorUrl = new URL(returnUrl, req.url);
    errorUrl.searchParams.set(
      "github_error",
      "GITHUB_CLIENT_ID belum dikonfigurasi di environment server"
    );
    return NextResponse.redirect(errorUrl);
  }

  // Buat state bertanda tangan kriptografis untuk mencegah serangan CSRF
  const secret = process.env.NEXTAUTH_SECRET || "susunpakeai-state-secret";
  const statePayload = JSON.stringify({
    userId,
    returnUrl,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  });

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(statePayload)
    .digest("hex");
  const state = Buffer.from(
    JSON.stringify({ payload: statePayload, sig: hmac })
  ).toString("base64url");

  // Scope HANYA 'repo' (akses minimal sesuai SECURITY.md poin 6)
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("scope", "repo");
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
