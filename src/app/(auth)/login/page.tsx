"use client";

// ============================================================
// app/(auth)/login/page.tsx — Halaman Autentikasi Terpadu
// Google OAuth 2.0 & Email + Password (Login / Register)
// Minimal, clean, developer tool aesthetic (DESIGN.md)
// ============================================================

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  ThemeToggle,
} from "@/components/ui";

// Helper membersihkan callbackUrl dari anchor hash landing page (#fitur, dll)
// Default kembali ke beranda ("/") jika tidak ada parameter rute privat yang diminta
function getSafeCallbackUrl(rawUrl: string | null): string {
  if (!rawUrl) return "/";
  const clean = rawUrl.split("#")[0].trim();
  if (
    !clean ||
    clean === "/" ||
    clean.startsWith("/login") ||
    clean.startsWith("/register")
  ) {
    return "/";
  }
  if (clean.startsWith("/")) {
    return clean;
  }
  try {
    const parsed = new URL(clean);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      const pathname = parsed.pathname;
      if (
        !pathname ||
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register")
      ) {
        return "/";
      }
      return `${pathname}${parsed.search}`;
    }
  } catch {
    return "/";
  }
  return "/";
}

function LoginFormContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state: "login" | "register" (mendukung ?mode=signup / ?tab=register)
  const initialMode = searchParams.get("mode") || searchParams.get("tab");
  const isRegisterInitial = initialMode === "register" || initialMode === "signup";
  const [tab, setTab] = useState<"login" | "register">(isRegisterInitial ? "register" : "login");

  // Sinkronisasi otomatis saat query parameter berubah di URL
  useEffect(() => {
    const mode = searchParams.get("mode") || searchParams.get("tab");
    if (mode === "register" || mode === "signup") {
      setTab("register");
    } else if (mode === "login" || mode === "signin") {
      setTab("login");
    }
  }, [searchParams]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Jika sudah login, langsung redirect ke dashboard (atau safe callbackUrl)
  useEffect(() => {
    if (status === "authenticated" && session) {
      const targetUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
      router.replace(targetUrl);
    }
  }, [session, status, router, searchParams]);

  // Handle Login dengan Email + Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail || !loginPassword) {
      setLoginError("Alamat email dan kata sandi wajib diisi");
      return;
    }

    const targetUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
    setLoginLoading(true);
    try {
      const res = await signIn("credentials", {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
        callbackUrl: targetUrl,
      });

      if (res?.error) {
        // Tampilkan pesan generik sesuai SECURITY.md
        setLoginError("Email atau kata sandi salah");
      } else if (res?.ok) {
        // Invalidate & refresh session client-side agar avatar dan token segar termuat
        await getSession();
        router.push(targetUrl);
        router.refresh();
      }
    } catch {
      setLoginError("Terjadi kesalahan sistem saat mencoba masuk");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register dengan Email + Password (auto-login setelah sukses)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Client-side quick checks
    if (!regName.trim()) {
      setRegError("Nama lengkap wajib diisi");
      return;
    }
    if (!regEmail.trim()) {
      setRegError("Alamat email wajib diisi");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("Kata sandi minimal 8 karakter");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Konfirmasi kata sandi tidak cocok");
      return;
    }

    setRegLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      // Verifikasi ketat: status harus 2xx, success harus true, dan data user harus valid
      const isSuccess =
        response.ok &&
        response.status >= 200 &&
        response.status < 300 &&
        data?.success === true &&
        Boolean(data?.user?.email);

      if (!isSuccess) {
        const errorMsg =
          data?.message ||
          `Pendaftaran gagal diproses oleh server (kode status: ${response.status}).`;
        setRegError(errorMsg);
        setRegLoading(false);
        // Pastikan TIDAK ADA state login, redirect ke dashboard, atau session palsu
        return;
      }

      const targetUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

      // Auto-login HANYA jika server benar-benar sukses menyimpan user di database
      const loginRes = await signIn("credentials", {
        email: regEmail,
        password: regPassword,
        redirect: false,
        callbackUrl: targetUrl,
      });

      if (loginRes?.ok) {
        // Invalidate & refresh session client-side agar avatar dan token segar termuat
        await getSession();
        router.push(targetUrl);
        router.refresh();
      } else {
        // Fallback jika signIn gagal: alihkan ke form login manual dengan email terisi
        setTab("login");
        setLoginEmail(regEmail);
        setLoginError("Akun berhasil dibuat di database. Silakan masuk dengan kata sandi Anda.");
      }
    } catch {
      setRegError("Terjadi kesalahan jaringan atau koneksi server saat mendaftar");
    } finally {
      setRegLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuroraBackground intensity="subtle">
      <GridBackground subtle={true}>
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            {/* Header Branding with ThemeToggle and Back to Home */}
            <div className="relative text-center mb-8">
              <div className="absolute left-0 top-0">
                <Link
                  id="login-back-home-btn"
                  href="/"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/50 hover:bg-surface text-xs font-mono text-muted-fg hover:text-foreground transition-colors shadow-sm"
                  title="Kembali ke Beranda"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Beranda</span>
                </Link>
              </div>
              <div className="absolute right-0 top-0">
                <ThemeToggle />
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface border border-border mb-3 hover:border-primary/40 transition-colors shadow-sm"
              >
                <span className="text-2xl">📄</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-mono">
                Susun Pake AI
              </h1>
              <p className="text-muted-fg text-sm mt-1 font-sans">
                Susun 8 dokumen spek dan arsitektur{" "}
                <span className="text-foreground font-medium">project kamu</span> secara rapi
              </p>
            </div>

            {/* Main Card */}
            <GlassPill variant="card" className="p-6 sm:p-8 border-border shadow-2xl backdrop-blur-xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-background/80 border border-border rounded-xl mb-6">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setTab("login");
                setLoginError(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "login"
                  ? "bg-surface text-foreground shadow-sm border border-border font-semibold"
                  : "text-muted-fg hover:text-foreground"
              }`}
            >
              Masuk
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setTab("register");
                setRegError(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "register"
                  ? "bg-surface text-foreground shadow-sm border border-border font-semibold"
                  : "text-muted-fg hover:text-foreground"
              }`}
            >
              Daftar
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                {loginError && (
                  <div
                    id="login-error-alert"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed"
                  >
                    {loginError}
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Alamat Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Masukkan alamat email"
                    className="w-full px-3.5 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                      title={showLoginPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Lupa Kata Sandi Link */}
                  <div className="mt-2 text-right">
                    <Link
                      id="forgot-password-link"
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline transition-colors font-medium"
                    >
                      Lupa Kata Sandi?
                    </Link>
                  </div>
                </div>

                {/* Submit Button */}
                <MagneticButton
                  id="email-login-submit"
                  type="submit"
                  disabled={loginLoading}
                  variant="primary"
                  strength={0.25}
                  className="w-full mt-2 py-3 text-primary-fg font-semibold"
                >
                  {loginLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    "Masuk ke Akun"
                  )}
                </MagneticButton>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                {regError && (
                  <div
                    id="register-error-alert"
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed"
                  >
                    {regError}
                  </div>
                )}

                {/* Nama Lengkap */}
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-3.5 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                {/* Alamat Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Alamat Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Masukkan alamat email"
                    className="w-full px-3.5 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                {/* Kata Sandi */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                      title={showRegPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-fg">
                    Minimal 8 karakter dengan huruf besar, huruf kecil, dan angka
                  </p>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-medium text-foreground/80 mb-1.5"
                  >
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm-password"
                      type={showRegConfirmPassword ? "text" : "password"}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Masukkan konfirmasi kata sandi"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                      title={showRegConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {showRegConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <MagneticButton
                  id="email-register-submit"
                  type="submit"
                  disabled={regLoading}
                  variant="primary"
                  strength={0.25}
                  className="w-full mt-2 py-3 text-primary-fg font-semibold"
                >
                  {regLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
                      <span>Mendaftarkan akun...</span>
                    </>
                  ) : (
                    "Daftar Sekarang"
                  )}
                </MagneticButton>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative px-3 bg-surface text-xs text-muted-fg uppercase tracking-wider font-mono">
              atau {tab === "login" ? "masuk dengan Google" : "daftar dengan Google"}
            </span>
          </div>

          {/* Opsi Google OAuth (Diletakkan SETELAH form input) */}
          <button
            id="google-login-btn"
            type="button"
            onClick={() =>
              signIn("google", {
                callbackUrl: getSafeCallbackUrl(searchParams.get("callbackUrl")),
              })
            }
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            <span>{tab === "login" ? "Masuk dengan Google" : "Daftar dengan Google"}</span>
          </button>
        </GlassPill>

        {/* Footer */}
        <p className="text-center text-xs text-muted-fg mt-6 leading-relaxed">
          Dengan melanjutkan, Anda menyetujui ketentuan penggunaan Susun Pake AI
          untuk penyusunan spesifikasi project perangkat lunak.
        </p>
      </motion.div>
    </main>
      </GridBackground>
    </AuroraBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
