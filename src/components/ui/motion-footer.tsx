"use client";

// ============================================================
// components/ui/motion-footer.tsx — Cinematic Footer
// Menggunakan Framer Motion (useScroll, useTransform) — Bukan GSAP
// Khusus Susun Pake AI: Watermark "SUSUN PAKE AI", Marquee Proposisi Nilai,
// Clean SaaS Action Buttons, Zero Mobile App Buttons, Zero Back to Top
// ============================================================

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Terminal, ShieldCheck, ArrowRight, FileCode2, Sparkles, Layers } from "lucide-react";
import { GlassPill, MagneticButton } from "@/components/ui";

const MARQUEE_ITEMS = [
  "Spec Generator",
  "Real-Time Live Preview",
  "Architecture Blueprint",
  "Clean Vibe Coding",
  "Zero Hardcode",
  "8 Foundation Specs",
  "NextAuth Dual Provider",
  "Database Schema ERD",
];

export function CinematicFooter() {
  const containerRef = useRef<HTMLElement>(null);

  // Parallax watermark scroll-based animation via Framer Motion
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });

  const watermarkY = useTransform(scrollYProgress, [0, 1], [40, -10]);
  const watermarkOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [0.01, 0.04, 0.07]);
  const watermarkLetterSpacing = useTransform(scrollYProgress, [0, 1], ["0.02em", "0.08em"]);

  return (
    <footer
      ref={containerRef}
      className="relative w-full overflow-hidden bg-[#0A0F1D] text-slate-100 border-t border-white/10 pt-20 pb-12 select-none"
    >
      {/* Background Aurora / Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[350px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-40" />

      {/* Marquee Banner Running Row */}
      <div className="relative w-full overflow-hidden py-4 -rotate-1 mb-16 border-y border-white/10 bg-surface/50 backdrop-blur-md shadow-2xl">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="flex whitespace-nowrap gap-12 font-mono text-xs sm:text-sm tracking-wider uppercase text-slate-300"
        >
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <span key={idx} className="flex items-center gap-4">
              <span className="text-primary font-bold">✦</span>
              <span>{item}</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* Main Footer Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-16 border-b border-white/10">
          {/* Brand Info */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/20 text-[#0F172A]">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="font-mono text-xl font-bold tracking-tight text-white block">
                  Susun Pake AI
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  Spesifikasi & Arsitektur Project Otomatis
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Platform generator fondasi dokumen arsitektur dan spesifikasi proyek perangkat lunak.
              Otomasi 8 berkas spek vibe coding dalam hitungan menit lewat klarifikasi conversational AI.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <GlassPill className="text-xs font-mono text-primary border-primary/20 bg-primary/5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
                Vibe Coding Ready
              </GlassPill>
              <GlassPill className="text-xs font-mono text-slate-300 border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 inline text-emerald-400" />
                Zero Cost Infrastructure
              </GlassPill>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-slate-300 font-semibold mb-4">
                Navigasi
              </h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <Link href="/#fitur" className="hover:text-primary transition-colors">
                    Fitur Unggulan
                  </Link>
                </li>
                <li>
                  <Link href="/#alur-kerja" className="hover:text-primary transition-colors">
                    Alur Kerja
                  </Link>
                </li>
                <li>
                  <Link href="/#statistik" className="hover:text-primary transition-colors">
                    Statistik Riil
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary transition-colors">
                    Masuk Akun
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-slate-300 font-semibold mb-4">
                Dokumen 8-in-1
              </h4>
              <ul className="space-y-2 text-xs font-mono text-slate-400">
                <li className="hover:text-slate-200">PRD.md</li>
                <li className="hover:text-slate-200">ARCHITECTURE.md</li>
                <li className="hover:text-slate-200">DESIGN.md</li>
                <li className="hover:text-slate-200">CLAUDE.md</li>
                <li className="hover:text-slate-200">SKILL.md</li>
                <li className="hover:text-slate-200">TODO.md</li>
                <li className="hover:text-slate-200">WORKFLOW.md</li>
                <li className="hover:text-slate-200">SECURITY.md</li>
              </ul>
            </div>
          </div>

          {/* Call to Action Box */}
          <div className="lg:col-span-4 flex flex-col justify-between p-6 rounded-2xl bg-surface/40 border border-white/10 backdrop-blur-md">
            <div>
              <h4 className="font-mono text-sm uppercase tracking-wider text-white font-bold mb-2">
                Mulai Susun Proyek Anda
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Generate 8 spesifikasi arsitektur proyek lengkap siap pakai untuk Cursor, Claude Code, dan Antigravity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <MagneticButton
                href="/register"
                variant="primary"
                className="w-full sm:w-auto text-xs py-2.5"
              >
                <Terminal className="w-3.5 h-3.5 mr-1.5" />
                Mulai Susun Proyek
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </MagneticButton>

              <MagneticButton
                href="/#fitur"
                variant="glass"
                className="w-full sm:w-auto text-xs py-2.5"
              >
                <FileCode2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Dokumentasi
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <p>© 2026 Susun Pake AI. All rights reserved.</p>

          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">Crafted with ❤ for Susun Pake AI Builders</span>
          </div>
        </div>
      </div>

      {/* Giant Parallax Watermark Text */}
      <motion.div
        style={{
          y: watermarkY,
          opacity: watermarkOpacity,
          letterSpacing: watermarkLetterSpacing,
        }}
        className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[14vw] font-black uppercase text-white leading-none z-0"
      >
        SUSUN PAKE AI
      </motion.div>
    </footer>
  );
}

export default CinematicFooter;
