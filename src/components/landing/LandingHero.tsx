"use client";

// ============================================================
// components/landing/LandingHero.tsx — Cinematic Glass Landing Page
// HANYA menggunakan Framer Motion (TANPA GSAP / ScrollTrigger)
// Menggunakan Primitive: GlassPill, MagneticButton, AuroraBackground,
// GridBackground, MarqueeRow (DESIGN.md § 6 Design Tokens)
// ============================================================

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  Database,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  GitBranch,
  Layers,
  CheckCircle2,
  Terminal,
  Cpu,
} from "lucide-react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  MarqueeRow,
} from "@/components/ui";
import { Navbar, Footer } from "@/components/layout";

const DOCS = [
  { name: "PRD.md", desc: "Requirements & Fitur Produk", color: "from-blue-500/20" },
  { name: "ARCHITECTURE.md", desc: "Arsitektur & Diagram Entitas", color: "from-emerald-500/20" },
  { name: "DESIGN.md", desc: "Design Tokens & Panduan Visual", color: "from-purple-500/20" },
  { name: "CLAUDE.md", desc: "Instruksi & Konteks Asisten AI", color: "from-amber-500/20" },
  { name: "SKILL.md", desc: "Pola & Standar Kode Terbaik", color: "from-cyan-500/20" },
  { name: "TODO.md", desc: "Rencana & Milestone Pengembangan", color: "from-pink-500/20" },
  { name: "WORKFLOW.md", desc: "Strategi Git & Alur Kolaborasi", color: "from-indigo-500/20" },
  { name: "SECURITY.md", desc: "Standar Keamanan & Proteksi Sistem", color: "from-rose-500/20" },
];

const MARQUEE_ITEMS = [
  "8 Dokumen Spek Lengkap Sekaligus",
  "Visualisasi Skema Database Interaktif",
  "Generate Dokumen Real-Time",
  "Prompt Context Siap Pakai Buat AI",
  "Push Langsung ke Repo GitHub",
  "Version History & Auto Backup",
  "Gratis Tanpa Biaya Langganan",
  "Arsitektur Rapi & Anti-Pusing",
];

export default function LandingHero() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState({ usersCount: 0, projectsCount: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Ambil statistik penggunaan nyata dari database secara real-time
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setStats(json.data);
            setStatsLoaded(true);
          }
        }
      } catch (err) {
        console.warn("Gagal mengambil statistik nyata:", err);
      }
    }
    fetchStats();

    // Auto-scroll ke anchor section jika terdapat hash pada URL (navigasi dari luar maupun hash change)
    const scrollToHash = () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.replace("#", "");
        const target = document.getElementById(hash);
        if (target) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      }
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Standardized Global Navbar (Single Source of Truth) */}
      <Navbar />

      {/* 
        MAIN CONTENT AREA (Curtain Reveal Top Container)
        Solid background, z-10, and hardware accelerated stacking
      */}
      <main className="relative z-10 w-full bg-background border-b border-white/10 shadow-2xl">
        {/* 2. Hero Section with Aurora & Grid Background */}
        <AuroraBackground intensity="medium">
          <GridBackground subtle={false} size={40} className="pt-20 pb-20 sm:pt-28 sm:pb-28 relative overflow-hidden">
            {/* Giant Background Watermark Text (DESIGN.md § 5.1) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14vw] font-mono font-black text-white/[0.018] tracking-widest select-none pointer-events-none whitespace-nowrap z-0">
              SPESIFIKASI
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
              {/* Top Tag Pill */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-block mb-6"
              >
                <GlassPill variant="pill" glow={true} className="border-primary/30">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-mono font-medium">
                    Bikin Spek &amp; Arsitektur Rapi
                  </span>
                  <span className="text-muted-fg">·</span>
                  <span className="text-xs text-muted-fg">100% Gratis Buat Dicoba</span>
                </GlassPill>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Dari Ide Project ke{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-teal-300">
                  8 Dokumen Spek Utama
                </span>{" "}
                Siap Eksekusi
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-muted-fg max-w-2xl mx-auto mb-10 leading-relaxed font-sans"
              >
                Susun arsitektur dan spek aplikasi kamu dalam hitungan menit. Dapet skema database visual,
                standar keamanan, dan prompt context siap pakai buat Claude, Cursor, Windsurf, Antigravity, atau tim developer kamu.
              </motion.p>

              {/* Call to Actions */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <MagneticButton
                  id="hero-cta-start"
                  href={status === "authenticated" ? "/dashboard" : "/register"}
                  variant="primary"
                  strength={0.35}
                  className="px-8 py-4 text-base font-mono w-full sm:w-auto"
                >
                  <span>{status === "authenticated" ? "Buka Dashboard Project" : "Mulai Bikin Project Sekarang"}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </MagneticButton>

                <MagneticButton
                  href="/#fitur"
                  variant="glass"
                  strength={0.25}
                  className="px-7 py-4 text-sm font-mono w-full sm:w-auto text-muted-fg hover:text-foreground"
                >
                  <span>Jelajahi Fitur</span>
                </MagneticButton>
              </motion.div>

              {/* 8 Files Quick Badges Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left"
              >
                {DOCS.map((doc, idx) => (
                  <GlassPill
                    key={doc.name}
                    variant="badge"
                    className="p-3 justify-start gap-2.5 hover:border-primary/40 transition-colors w-full"
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="truncate">
                      <div className="font-mono text-xs font-semibold text-foreground truncate">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-muted-fg truncate">
                        {doc.desc}
                      </div>
                    </div>
                  </GlassPill>
                ))}
              </motion.div>
            </div>
          </GridBackground>
        </AuroraBackground>

        {/* 3. Marquee Row Highlights */}
        <section className="border-y border-white/5 bg-surface/30 backdrop-blur-sm">
          <MarqueeRow items={MARQUEE_ITEMS} speed={25} direction="left" />
        </section>

        {/* 4. Cinematic Feature Cards (Minimal 3 Fitur Utama) */}
        <section id="fitur" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <GlassPill variant="badge" className="mb-4">
              <Sparkles className="w-3 h-3 text-primary mr-1" />
              Kenapa Susun Pake AI?
            </GlassPill>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Nggak Ada Lagi Drama Coding Tanpa Arah
            </h2>
            <p className="text-muted-fg text-sm sm:text-base leading-relaxed">
              Biar nggak pusing bongkar pasang kodingan di tengah jalan, rapiin rancangan awalnya dulu di sini.
              Coding jadi jauh lebih lancar, minim revisi, dan prompt AI makin tepat sasaran.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Generate 8 Dokumen Sekaligus */}
            <GlassPill variant="card" className="flex flex-col justify-between group">
              <div>
                {/* Animated Mini Illustration */}
                <div className="h-44 rounded-xl bg-muted/60 border border-white/5 p-4 flex flex-col justify-center items-center relative overflow-hidden mb-6 group-hover:border-primary/30 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

                  {/* Stacking Files Animation */}
                  <div className="relative w-36 h-28 flex items-center justify-center">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute w-28 h-20 rounded-lg bg-surface border border-white/10 shadow-lg top-0 rotate-[-4deg] p-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="text-[9px] font-mono text-muted-fg">SECURITY.md</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-white/10 rounded w-3/4" />
                        <div className="h-1 bg-white/10 rounded w-1/2" />
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute w-28 h-20 rounded-lg bg-surface border border-white/15 shadow-xl top-3 rotate-[3deg] p-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500/80" />
                        <span className="text-[9px] font-mono text-muted-fg">PRD.md</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-white/10 rounded w-4/5" />
                        <div className="h-1 bg-white/10 rounded w-2/3" />
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute w-32 h-22 rounded-lg bg-surface border border-primary/40 shadow-2xl top-5 p-2.5 flex flex-col justify-between z-10"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-primary">
                          ARCHITECTURE.md
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1.5 bg-primary/30 rounded w-full" />
                        <div className="h-1 bg-white/20 rounded w-5/6" />
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="font-mono font-bold text-lg text-foreground">
                    Generate 8 Dokumen Sekaligus
                  </h3>
                </div>
                <p className="text-sm text-muted-fg leading-relaxed">
                  Cukup ngobrol santai lewat interview AI, 8 dokumen spek lengkap (PRD, ARCHITECTURE,
                  DESIGN, CLAUDE, SKILL, TODO, WORKFLOW, SECURITY) langsung tersusun rapi dan saling nyambung.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-muted-fg">
                <span>Sekali Prompt, Beres Semua</span>
                <span className="text-primary font-semibold">100% Terstruktur</span>
              </div>
            </GlassPill>

            {/* Card 2: Live Preview & Diagram Relasi Basis Data */}
            <GlassPill variant="card" className="flex flex-col justify-between group">
              <div>
                {/* Animated Mini Illustration */}
                <div className="h-44 rounded-xl bg-muted/60 border border-white/5 p-4 flex flex-col justify-center items-center relative overflow-hidden mb-6 group-hover:border-primary/30 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

                  {/* Animated Mini ERD Network */}
                  <div className="relative w-44 h-28 flex items-center justify-between px-2">
                    {/* Entity USERS */}
                    <motion.div
                      animate={{ x: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 rounded border border-primary/50 bg-surface/90 p-1.5 text-center shadow"
                    >
                      <div className="text-[9px] font-mono font-bold text-primary">USERS</div>
                      <div className="h-0.5 bg-white/20 my-1" />
                      <div className="text-[7px] font-mono text-muted-fg">id, email</div>
                    </motion.div>

                    {/* Pulsing Relationship Line */}
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="h-[2px] w-full bg-border" />
                      <motion.div
                        animate={{ x: [-20, 20], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute w-2 h-2 rounded-full bg-primary"
                      />
                    </div>

                    {/* Entity PROJECTS */}
                    <motion.div
                      animate={{ x: [0, 2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-18 rounded border border-primary/50 bg-surface/90 p-1.5 text-center shadow"
                    >
                      <div className="text-[9px] font-mono font-bold text-primary">PROJECTS</div>
                      <div className="h-0.5 bg-white/20 my-1" />
                      <div className="text-[7px] font-mono text-muted-fg">id, userId</div>
                    </motion.div>
                  </div>

                  <div className="text-[10px] font-mono text-primary flex items-center gap-1 mt-1">
                    <Database className="w-3 h-3" />
                    <span>Visualisasi Struktur Skema Database</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="font-mono font-bold text-lg text-foreground">
                    Preview Live &amp; Skema Database Visual
                  </h3>
                </div>
                <p className="text-sm text-muted-fg leading-relaxed">
                  Lihat struktur tabel, field, dan relasi entitas aplikasi kamu dalam bentuk visual
                  interaktif. Nggak perlu pusing gambar diagram manual dari nol.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-muted-fg">
                <span>Visual ERD Otomatis</span>
                <span className="text-primary font-semibold">Langsung Paham Relasi</span>
              </div>
            </GlassPill>

            {/* Card 3: Refinement Interaktif Real-Time */}
            <GlassPill variant="card" className="flex flex-col justify-between group">
              <div>
                {/* Animated Mini Illustration */}
                <div className="h-44 rounded-xl bg-muted/60 border border-white/5 p-4 flex flex-col justify-center items-center relative overflow-hidden mb-6 group-hover:border-primary/30 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent pointer-events-none" />

                  {/* Animated Chat Bubbles */}
                  <div className="w-full max-w-[200px] space-y-2">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                      className="p-2 rounded-lg bg-surface border border-white/10 text-[9px] font-mono text-muted-fg"
                    >
                      "Tambahkan field OAuth Google &amp; GitHub..."
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-[9px] font-mono text-primary flex items-center justify-between"
                    >
                      <span>✓ ARCHITECTURE.md di-update live!</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    </motion.div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="font-mono font-bold text-lg text-foreground">
                    Revisi Santai Lewat Chat Interaktif
                  </h3>
                </div>
                <p className="text-sm text-muted-fg leading-relaxed">
                  Mau nambah fitur OAuth, ubah skema tabel, atau ganti tech stack? Tinggal bilang lewat chat,
                  AI bakal langsung perbarui dokumen terkait lengkap dengan riwayat versinya.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-muted-fg">
                <span>Auto Version History</span>
                <span className="text-primary font-semibold">Update Real-Time</span>
              </div>
            </GlassPill>
          </div>
        </section>

        {/* 5. Alur Kerja 4 Langkah Singkat */}
        <section id="alur-kerja" className="py-20 border-t border-white/5 bg-surface/20 relative overflow-hidden">
          {/* Giant Background Watermark Text (DESIGN.md § 5.1) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13vw] font-mono font-black text-white/[0.015] tracking-widest select-none pointer-events-none whitespace-nowrap z-0">
            WORKFLOW
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <GlassPill variant="badge" className="mb-3">
                <Zap className="w-3 h-3 text-primary mr-1" />
                Alur Praktis
              </GlassPill>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Dari Ide Jadi Spek Matang dalam 4 Langkah
              </h2>
              <p className="text-muted-fg text-sm">
                Nggak ada proses ribet. Cukup ceritain konsep aplikasi yang ada di kepala kamu.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Ceritain Ide Project Kamu",
                  desc: "Tulis nama project, masalah apa yang mau diselesaiin, dan tech stack favorit yang pengen kamu pakai.",
                },
                {
                  step: "02",
                  title: "Tanya Jawab Santai Bareng AI",
                  desc: "AI bakal nanya beberapa hal penting soal alur bisnis, user role, dan batasan teknis biar speknya makin matang.",
                },
                {
                  step: "03",
                  title: "Dokumen Tersusun Otomatis",
                  desc: "Tinggal duduk santai sambil liat 8 dokumen arsitektur dan skema database kamu dibikin secara real-time.",
                },
                {
                  step: "04",
                  title: "Push ke GitHub & Gas Coding",
                  desc: "Cek hasilnya di split-editor, push langsung ke repo GitHub kamu, atau download file zip-nya buat mulai eksekusi.",
                },
              ].map((item, idx) => (
                <GlassPill key={item.step} variant="card" className="p-6 relative">
                  <div className="text-3xl font-bold font-mono text-primary/30 mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-mono font-bold text-base text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-fg leading-relaxed">{item.desc}</p>
                </GlassPill>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Statistik Penggunaan Nyata (Real Database via /api/stats) */}
        <section id="statistik" className="py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <GlassPill variant="badge" className="mb-4">
              <Cpu className="w-3 h-3 text-primary mr-1" />
              Data Nyata
            </GlassPill>

            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Dipercaya Developer Buat Mulai Coding Lebih Cepat
            </h2>
            <p className="text-muted-fg text-sm max-w-xl mx-auto mb-12">
              Angka nyata dari database, bukan data bohongan. Ratusan blueprint project sudah berhasil dirancang.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassPill variant="card" className="p-6 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-primary mb-1">
                  {stats.usersCount}
                </div>
                <div className="text-xs font-mono text-muted-fg">Developer Bergabung</div>
              </GlassPill>

              <GlassPill variant="card" className="p-6 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-primary mb-1">
                  {stats.projectsCount}
                </div>
                <div className="text-xs font-mono text-muted-fg">Project Berhasil Disusun</div>
              </GlassPill>

              <GlassPill variant="card" className="p-6 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-foreground mb-1">
                  8
                </div>
                <div className="text-xs font-mono text-muted-fg">Dokumen per Project</div>
              </GlassPill>

              <GlassPill variant="card" className="p-6 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 mb-1">
                  0 Rp
                </div>
                <div className="text-xs font-mono text-muted-fg">Gratis Sepuasnya</div>
              </GlassPill>
            </div>
          </div>
        </section>
      </main>

      {/* The Cinematic Footer (GSAP ScrollTrigger Curtain Reveal) */}
      <Footer />
    </div>
  );
}
