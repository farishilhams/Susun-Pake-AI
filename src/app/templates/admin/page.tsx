// ============================================================
// app/templates/admin/page.tsx — Panel Admin Kelola Template
// ============================================================

import type { Metadata } from "next";
import TemplateAdminClient from "@/components/templates/TemplateAdminClient";

export const metadata: Metadata = {
  title: "Kelola Katalog Template (Admin) — Susun Pake AI",
  description:
    "Panel admin untuk menambah, mengedit, dan menghapus entri starter codebase & template di database Susun Pake AI.",
};

export default function TemplateAdminPage() {
  return <TemplateAdminClient />;
}
