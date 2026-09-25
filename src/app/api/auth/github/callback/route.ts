// ============================================================
// app/api/auth/github/callback/route.ts
// Callback OAuth GitHub: Pertukaran code, enkripsi token, simpan ke DB
// Sesuai SECURITY.md § 6: token dienkripsi dengan AES-256-GCM
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { encrypt } from "@/lib/encryption";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = req.nextUrl.origin;

  if (errorParam) {
    console.error("GitHub OAuth callback error from provider:", errorParam);
    const redirectUrl = new URL("/dashboard", baseUrl);
    redirectUrl.searchParams.set("github_error", "Otorisasi GitHub dibatalkan oleh pengguna");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !stateParam) {
    const redirectUrl = new URL("/dashboard", baseUrl);
    redirectUrl.searchParams.set("github_error", "Parameter OAuth tidak lengkap");
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Verifikasi tanda tangan state (CSRF protection)
  const secret = process.env.NEXTAUTH_SECRET || "susunpakeai-state-secret";
  let userId: string;
  let returnUrl = "/dashboard";

  try {
    const decodedState = JSON.parse(
      Buffer.from(stateParam, "base64url").toString("utf-8")
    );
    const { payload, sig } = decodedState;

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (sig !== expectedHmac) {
      throw new Error("Tanda tangan state tidak valid");
    }

    const stateData = JSON.parse(payload);
    userId = stateData.userId;
    returnUrl = stateData.returnUrl || "/dashboard";

    // Cek batas waktu 15 menit
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      throw new Error("Sesi OAuth telah kedaluwarsa");
    }
  } catch (err) {
    console.error("State verification failed:", err);
    const redirectUrl = new URL("/dashboard", baseUrl);
    redirectUrl.searchParams.set("github_error", "Verifikasi sesi OAuth gagal");
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Tukar authorization code dengan access token GitHub
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL(returnUrl, baseUrl);
    redirectUrl.searchParams.set("github_error", "Kredensial GitHub belum lengkap di server");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("GitHub access token exchange error:", tokenData);
      const redirectUrl = new URL(returnUrl, baseUrl);
      redirectUrl.searchParams.set(
        "github_error",
        tokenData.error_description || "Gagal mendapatkan access token GitHub"
      );
      return NextResponse.redirect(redirectUrl);
    }

    const accessToken = tokenData.access_token as string;

    // 3. Ambil informasi profil GitHub user (username)
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "SusunPakeAI-App",
      },
    });

    let githubUsername = "";
    if (userRes.ok) {
      const userData = await userRes.json();
      githubUsername = userData.login || "";
    }

    // 4. Enkripsi token dengan AES-256-GCM sesuai SECURITY.md
    const encryptedToken = encrypt(accessToken);

    // 5. Simpan ke database
    await connectDB();
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          githubAccessToken: encryptedToken,
          githubUsername,
          githubConnectedAt: new Date(),
        },
      }
    );

    // Redirect kembali ke halaman asal dengan sinyal sukses
    const successUrl = new URL(returnUrl, baseUrl);
    successUrl.searchParams.set("github", "connected");
    return NextResponse.redirect(successUrl);
  } catch (err: unknown) {
    console.error("Exception in GitHub OAuth callback:", err);
    const redirectUrl = new URL(returnUrl, baseUrl);
    redirectUrl.searchParams.set("github_error", "Terjadi kesalahan internal saat menghubungkan GitHub");
    return NextResponse.redirect(redirectUrl);
  }
}
