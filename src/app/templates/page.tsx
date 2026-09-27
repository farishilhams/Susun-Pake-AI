import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Template from "@/models/Template";
import TemplateCatalogClient from "@/components/templates/TemplateCatalogClient";

export const metadata: Metadata = {
  title: "Katalog Starter Codebase & Template — Susun Pake AI",
  description:
    "Jelajahi dan gunakan template starter codebase siap pakai untuk mempercepat pembangunan produk dan vibe coding bersama AI.",
};

export default async function TemplatesPage() {
  await connectDB();
  const rawTemplates = await Template.find().sort({ order: 1, createdAt: -1 }).lean();
  const initialTemplates = JSON.parse(JSON.stringify(rawTemplates));

  // Kumpulkan stackTags unik dari database
  const allTags = new Set<string>();
  initialTemplates.forEach((t: { stackTags?: string[] }) => {
    t.stackTags?.forEach((tag: string) => allTags.add(tag));
  });

  return (
    <TemplateCatalogClient
      initialTemplates={initialTemplates}
      initialTags={Array.from(allTags)}
    />
  );
}
