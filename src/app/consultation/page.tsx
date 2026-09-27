// ============================================================
// app/consultation/page.tsx — Halaman Konsultasi Arsitektur & Produk
// ============================================================

import type { Metadata } from "next";
import ConsultationChatClient from "@/components/consultation/ConsultationChatClient";

export const metadata: Metadata = {
  title: "Konsultasi AI Arsitektur & Strategi Produk — Susun Pake AI",
  description:
    "Diskusikan ide aplikasi, pemilihan tech stack, struktur database, dan strategi vibe coding dengan asisten konsultan AI.",
};

export default function ConsultationPage() {
  return <ConsultationChatClient />;
}
