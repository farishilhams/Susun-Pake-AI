"use client";

// ============================================================
// components/templates/TemplateCatalogClient.tsx
// Halaman Katalog Template & Starter Codebase
// Menampilkan grid kartu template, pencarian, filter stack tag,
// serta Empty State transparan jika belum ada template tersedia.
// ============================================================

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Tag,
  Code2,
} from "lucide-react";
import { GithubLogo } from "@phosphor-icons/react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
} from "@/components/ui";
import { Navbar, Footer } from "@/components/layout";
import { isUserAdmin } from "@/lib/admin";

interface TemplateItem {
  _id: string;
  name: string;
  description: string;
  stackTags: string[];
  thumbnailUrl?: string;
  repoUrl: string;
  useTemplateUrl: string;
  featured?: boolean;
  order?: number;
  createdAt: string;
}

interface TemplateCatalogClientProps {
  initialTemplates?: TemplateItem[];
  initialTags?: string[];
}

export default function TemplateCatalogClient({
  initialTemplates,
  initialTags = [],
}: TemplateCatalogClientProps = {}) {
  const { data: session } = useSession();
  const isAdmin = isUserAdmin(session?.user);

  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates || []);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [loading, setLoading] = useState(initialTemplates === undefined);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const isInitialMount = React.useRef(true);

  // Ambil data template dari API
  const fetchTemplates = async (searchQuery = "", tagFilter: string | null = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (tagFilter) params.set("tag", tagFilter);

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTemplates(json.data.templates || []);
          if (json.data.availableTags) {
            setAvailableTags(json.data.availableTags);
          }
        }
      }
    } catch (err) {
      console.error("Gagal memuat template:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Lewatkan pemanggilan API awal jika SSR sudah menyediakan initialTemplates
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialTemplates !== undefined) {
        return;
      }
    }
    fetchTemplates(search, selectedTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates(search, selectedTag);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="relative flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full min-h-[calc(100vh-14rem)] flex flex-col justify-start">
        <AuroraBackground />
        <GridBackground />

        {/* Header Hero Section */}
        <div className="relative z-10 text-center max-w-3xl mx-auto mb-12">
          <div className="flex justify-center mb-4">
            <GlassPill className="text-primary font-medium text-xs sm:text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <span>Starter Codebase & Template Siap Pakai</span>
            </GlassPill>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
            Katalog Template <span className="text-primary">Vibe Coding</span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
            Pilih fondasi starter codebase yang sudah teruji dan terstandarisasi untuk
            langsung dieksekusi bersama AI Coding Assistant (Claude Code, Cursor, Antigravity).
          </p>

          {/* Tombol Khusus Admin/Farish jika sedang login */}
          {isAdmin && (
            <div className="flex justify-center gap-3 mb-6">
              <MagneticButton
                href="/templates/admin"
                id="btn-admin-manage-templates"
                className="px-5 py-2.5 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Kelola Katalog Template (Admin)</span>
              </MagneticButton>
            </div>
          )}

          {/* Search & Tag Filter Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center max-w-xl mx-auto mb-6"
          >
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan nama, stack (Next.js, FastAPI, Tailwind)..."
                className="w-full pl-11 pr-24 py-3 bg-card/60 backdrop-blur-md border border-border/60 rounded-full text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60 shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors"
              >
                Cari
              </button>
            </div>
          </form>

          {/* Tag Filter Pills */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedTag === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/40 border border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua Stack
              </button>
              {availableTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedTag === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-card/40 border border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tag className="w-3 h-3 opacity-60" />
                  <span>{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col justify-start min-h-[420px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[380px] py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground text-sm font-mono">Memuat katalog template...</p>
            </div>
          ) : templates.length === 0 ? (
            /* EMPTY STATE ASLI (0 TEMPLATE) */
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-2xl">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Layers className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Belum Ada Template Tersedia
              </h2>

              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-8">
                Katalog starter codebase sedang dipersiapkan oleh tim Susun Pake AI.
                Kamu bisa mulai dengan menyusun arsitektur dan spesifikasi baru dari nol lewat AI
                atau mengisi template lewat dasbor admin.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <MagneticButton
                  href="/new-project"
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Susun Project Baru</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </MagneticButton>

                {isAdmin && (
                  <MagneticButton
                    href="/templates/admin"
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-secondary/80 border border-border/60 text-secondary-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-all"
                  >
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <span>Tambah Template Pertama</span>
                  </MagneticButton>
                )}
              </div>
            </div>
          ) : (
            /* GRID KARTU TEMPLATE NYATA */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl._id}
                  className="group relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 hover:shadow-xl transition-all duration-300"
                >
                  <div>
                    {/* Thumbnail / Header Badge */}
                    {tpl.thumbnailUrl ? (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-muted/20 border border-border/30">
                        <img
                          src={tpl.thumbnailUrl}
                          alt={tpl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-xl mb-4 bg-gradient-to-br from-primary/10 via-card to-background border border-border/30 flex items-center justify-center">
                        <Code2 className="w-8 h-8 text-primary/60" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h3>
                      {tpl.featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed">
                      {tpl.description}
                    </p>

                    {/* Stack Tags */}
                    {tpl.stackTags && tpl.stackTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {tpl.stackTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-primary/10 text-primary border border-primary/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                    <a
                      href={tpl.useTemplateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all shadow-md"
                    >
                      <span>Gunakan Template</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {tpl.repoUrl && (
                      <a
                        href={tpl.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Lihat Repository GitHub"
                        className="px-3 py-2.5 rounded-xl bg-secondary/80 border border-border/50 text-secondary-foreground hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <GithubLogo className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
