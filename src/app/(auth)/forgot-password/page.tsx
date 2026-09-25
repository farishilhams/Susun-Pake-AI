"use client";

// ============================================================
// app/(auth)/forgot-password/page.tsx — Halaman Lupa Kata Sandi
// Input email, kirim token reset acak, respons generik
// Sesuai ARCHITECTURE.md § 4 dan SECURITY.md
// Menggunakan Primitive: GlassPill, MagneticButton, AuroraBackground, GridBackground
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  ThemeToggle,
} from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Alamat email wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(
          data.message ||
            "Jika email terdaftar, tautan reset telah dikirim ke kotak masuk Anda."
        );
      } else {
        setErrorMessage(data.message || "Gagal memproses permintaan reset kata sandi");
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan saat mengirim permintaan");
    } finally {
      setLoading(false);
    }
  };

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
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface border border-white/10 mb-3 hover:border-primary/40 transition-colors shadow-sm"
              >
                <span className="text-2xl">📄</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-mono">
                Lupa Kata Sandi
              </h1>
              <p className="text-muted-fg text-sm mt-1 font-sans">
                Masukkan email Anda untuk menerima instruksi reset kata sandi
              </p>
            </div>

            {/* Card */}
            <GlassPill variant="card" className="p-6 sm:p-8 border-border shadow-2xl backdrop-blur-xl">
              {successMessage ? (
                <div className="space-y-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary text-xl">
                    ✓
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground mb-2">
                      Permintaan Diterima
                    </h2>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {successMessage}
                    </p>
                    <p className="text-xs text-muted-fg mt-3">
                      Periksa juga folder Spam atau Promosi jika email belum masuk
                      dalam beberapa menit.
                    </p>
                  </div>

                  <Link
                    href="/login"
                    className="inline-block w-full py-2.5 px-4 bg-surface hover:bg-surface-hover text-foreground font-medium text-sm rounded-xl border border-border transition-colors"
                  >
                    Kembali ke Halaman Masuk
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-xs font-medium text-foreground/80 mb-1.5"
                    >
                      Alamat Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan alamat email"
                      className="w-full px-3.5 py-2.5 bg-background/80 border border-border rounded-xl text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>

                  <MagneticButton
                    id="forgot-submit-btn"
                    type="submit"
                    disabled={loading}
                    variant="primary"
                    strength={0.25}
                    className="w-full mt-2 py-3 text-primary-fg font-semibold"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
                        <span>Mengirim instruksi...</span>
                      </>
                    ) : (
                      "Kirim Tautan Reset"
                    )}
                  </MagneticButton>

                  <div className="pt-2 text-center">
                    <Link
                      href="/login"
                      className="text-xs text-muted-fg hover:text-foreground transition-colors"
                    >
                      Ingat kata sandi? Masuk di sini
                    </Link>
                  </div>
                </form>
              )}
            </GlassPill>
          </motion.div>
        </main>
      </GridBackground>
    </AuroraBackground>
  );
}
