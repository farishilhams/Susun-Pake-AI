"use client";

// ============================================================
// app/(auth)/reset-password/page.tsx — Halaman Reset Kata Sandi
// Input kata sandi baru & konfirmasi, validasi token, toggle password
// Sesuai ARCHITECTURE.md § 4 dan SECURITY.md
// Menggunakan Primitive: GlassPill, MagneticButton, AuroraBackground, GridBackground
// ============================================================

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  ThemeToggle,
} from "@/components/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isInvalidParams = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Kata sandi minimal 8 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setErrorMessage(
          data.message ||
            "Tautan reset kata sandi tidak valid atau telah kedaluwarsa"
        );
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan saat mereset kata sandi");
    } finally {
      setLoading(false);
    }
  };

  if (isInvalidParams) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 text-xl">
          ✕
        </div>
        <h2 className="text-base font-semibold text-slate-100 font-mono">
          Tautan Tidak Valid
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed font-sans">
          Tautan pengaturan ulang kata sandi ini tidak lengkap atau tidak valid.
          Silakan ajukan permintaan ulang melalui halaman lupa kata sandi.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-block py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium text-sm rounded-xl transition-colors font-mono"
          >
            Minta Tautan Baru
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-xl">
          ✓
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100 mb-2 font-mono">
            Kata Sandi Berhasil Diperbarui
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Kata sandi akun Anda telah berhasil diperbarui dan semua sesi aktif
            sebelumnya telah diinvalidasi demi keamanan.
          </p>
        </div>
        <Link
          id="login-after-reset-btn"
          href="/login"
          className="inline-block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm rounded-xl transition-colors shadow-sm font-mono text-center"
        >
          Masuk dengan Kata Sandi Baru
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          id="reset-error-alert"
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed"
        >
          {errorMessage}
        </div>
      )}

      {/* Email Terdaftar (Read-only info) */}
      <div>
        <label className="block text-xs font-medium text-foreground/80 mb-1">
          Alamat Email Akun
        </label>
        <div className="px-3.5 py-2 bg-background/50 border border-border rounded-xl text-foreground text-xs font-mono select-none">
          {email}
        </div>
      </div>

      {/* Kata Sandi Baru */}
      <div>
        <label
          htmlFor="reset-new-password"
          className="block text-xs font-medium text-foreground/80 mb-1.5"
        >
          Kata Sandi Baru
        </label>
        <div className="relative">
          <input
            id="reset-new-password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi baru"
            className="w-full pl-3.5 pr-10 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-colors cursor-pointer"
            title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          >
            {showPassword ? (
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

      {/* Konfirmasi Kata Sandi Baru */}
      <div>
        <label
          htmlFor="reset-confirm-password"
          className="block text-xs font-medium text-foreground/80 mb-1.5"
        >
          Konfirmasi Kata Sandi Baru
        </label>
        <div className="relative">
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Masukkan konfirmasi kata sandi baru"
            className="w-full pl-3.5 pr-10 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-colors cursor-pointer"
            title={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <MagneticButton
        id="reset-submit-btn"
        type="submit"
        disabled={loading}
        variant="primary"
        strength={0.25}
        className="w-full mt-2 py-3 text-primary-fg font-semibold"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
            <span>Menyimpan kata sandi...</span>
          </>
        ) : (
          "Simpan Kata Sandi Baru"
        )}
      </MagneticButton>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-xs text-muted-fg hover:text-foreground transition-colors"
        >
          Batal dan kembali ke halaman masuk
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            {/* Header Branding with ThemeToggle */}
            <div className="relative text-center mb-8">
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
                Atur Kata Sandi Baru
              </h1>
              <p className="text-muted-fg text-sm mt-1 font-sans">
                Buat kata sandi baru yang kuat untuk akun Susun Pake AI Anda
              </p>
            </div>

            {/* Card */}
            <GlassPill variant="card" className="p-6 sm:p-8 border-border shadow-2xl backdrop-blur-xl">
              <Suspense
                fallback={
                  <div className="py-8 text-center text-muted-fg text-sm">
                    Memuat formulir...
                  </div>
                }
              >
                <ResetPasswordForm />
              </Suspense>
            </GlassPill>
          </motion.div>
        </main>
      </GridBackground>
    </AuroraBackground>
  );
}
