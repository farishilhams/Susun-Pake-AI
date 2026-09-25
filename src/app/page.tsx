// ============================================================
// app/page.tsx — Landing Page (Homepage)
// Clean, technical, developer-first (DESIGN.md § 3)
// ============================================================

import type { Metadata } from "next";
import LandingHero from "@/components/landing/LandingHero";

export const metadata: Metadata = {
  title: "Susun Pake AI — Spesifikasi & Arsitektur Project Otomatis",
  description:
    "Susun spesifikasi project lengkap, diagram relasi entitas, panduan arsitektur, dan instruksi AI siap pakai secara cepat, terstruktur, dan terstandar.",
};

export default function HomePage() {
  return <LandingHero />;
}
