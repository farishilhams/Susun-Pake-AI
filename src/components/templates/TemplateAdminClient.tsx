"use client";

// ============================================================
// components/templates/TemplateAdminClient.tsx
// Panel Admin Khusus Farish/Owner untuk Mengelola Katalog Template
// Memungkinkan tambah, edit, dan hapus template langsung ke database
// ============================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShieldAlert,
  ArrowLeft,
  PlusCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  ConfirmModal,
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

export default function TemplateAdminClient() {
  const { data: session, status } = useSession();
  const isAdmin = isUserAdmin(session?.user);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stackTagsInput, setStackTagsInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [useTemplateUrl, setUseTemplateUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(0);

  // Ambil daftar template
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTemplates(json.data.templates || []);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data template:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStackTagsInput("");
    setThumbnailUrl("");
    setRepoUrl("");
    setUseTemplateUrl("");
    setFeatured(false);
    setOrder(0);
  };

  const handleEditClick = (tpl: TemplateItem) => {
    setEditingId(tpl._id);
    setName(tpl.name);
    setDescription(tpl.description);
    setStackTagsInput(tpl.stackTags ? tpl.stackTags.join(", ") : "");
    setThumbnailUrl(tpl.thumbnailUrl || "");
    setRepoUrl(tpl.repoUrl);
    setUseTemplateUrl(tpl.useTemplateUrl);
    setFeatured(Boolean(tpl.featured));
    setOrder(tpl.order ?? 0);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const tags = stackTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name,
      description,
      stackTags: tags,
      thumbnailUrl,
      repoUrl,
      useTemplateUrl,
      featured,
      order: Number(order) || 0,
    };

    try {
      const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan template");
      }

      setFeedback({
        type: "success",
        message: editingId
          ? "Template berhasil diperbarui!"
          : "Template baru berhasil ditambahkan!",
      });

      resetForm();
      fetchTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, templateName: string) => {
    setDeleteTarget({ id, name: templateName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/templates/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus template");
      }

      setFeedback({ type: "success", message: `Template "${deleteTarget.name}" berhasil dihapus.` });
      if (editingId === deleteTarget.id) resetForm();
      fetchTemplates();
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Proteksi Akses: Jika bukan admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-card/40 backdrop-blur-xl border border-destructive/30 rounded-3xl p-8 max-w-md text-center shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Akses Terbatas (Admin Only)</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Halaman ini dikhususkan bagi administrator Susun Pake AI untuk mengelola katalog starter codebase.
            </p>
            <MagneticButton
              href="/templates"
              className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Katalog Template</span>
            </MagneticButton>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="relative flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full min-h-[calc(100vh-14rem)] flex flex-col justify-start">
        <AuroraBackground />
        <GridBackground />

        {/* Header Navigation */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/templates"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Katalog Publik</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Kelola Katalog Template
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Akun aktif: <span className="text-primary font-mono">{session?.user?.email}</span> (Administrator)
            </p>
          </div>

          <GlassPill className="text-primary text-xs font-semibold">
            {templates.length} Template Terdaftar
          </GlassPill>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`relative z-10 p-4 rounded-2xl mb-6 flex items-start gap-3 border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Tambah / Edit */}
          <div className="lg:col-span-5">
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl sticky top-28">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Pencil className="w-4 h-4 text-primary" />
                      <span>Edit Template</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-primary" />
                      <span>Tambah Template Baru</span>
                    </>
                  )}
                </h2>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nama Starter Codebase <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Next.js 16 SaaS Boilerplate"
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Deskripsi Ringkas <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan fitur utama starter ini (auth, database, payment, dll)..."
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Stack Tags (Pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={stackTagsInput}
                    onChange={(e) => setStackTagsInput(e.target.value)}
                    placeholder="Next.js, Tailwind v4, MongoDB, NextAuth"
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    URL Repository GitHub <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo-name"
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    URL Gunakan Template (Direct Action) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={useTemplateUrl}
                    onChange={(e) => setUseTemplateUrl(e.target.value)}
                    placeholder="https://github.com/new?template_name=... atau link repo"
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Thumbnail Image URL (Opsional)
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... atau URL gambar"
                    className="w-full px-3.5 py-2.5 bg-background/50 border border-border/60 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary/40"
                    />
                    <span>Tandai sebagai Featured</span>
                  </label>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Urutan:</span>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-background/50 border border-border/60 rounded-lg text-xs text-foreground text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? "Menyimpan..." : editingId ? "Perbarui Template" : "Simpan Template ke Katalog"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* List Template Existing */}
          <div className="lg:col-span-7">
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Daftar Template di Database ({templates.length})</span>
              </h2>

              {templates.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
                  <p className="text-muted-foreground text-sm">
                    Belum ada template tersimpan di database.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Gunakan formulir di sebelah kiri untuk menambahkan template pertama.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((tpl) => (
                    <div
                      key={tpl._id}
                      className="p-4 rounded-xl bg-background/50 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm text-foreground truncate">
                            {tpl.name}
                          </h3>
                          {tpl.featured && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                              Featured
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {tpl.description}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {tpl.stackTags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={tpl.useTemplateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground"
                          title="Buka Link Template"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleEditClick(tpl)}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Edit Template"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(tpl._id, tpl.name)}
                          className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Hapus Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Konfirmasi Hapus Template */}
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => !isDeleting && setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="Hapus Template dari Katalog?"
          description={
            <span>
              Apakah Anda yakin ingin menghapus template{" "}
              <strong className="text-foreground">"{deleteTarget?.name}"</strong> dari katalog
              publik? Tindakan ini tidak dapat dibatalkan.
            </span>
          }
          confirmText="Ya, Hapus Template"
          cancelText="Batal"
          variant="danger"
          isLoading={isDeleting}
        />
      </main>

      <Footer />
    </div>
  );
}
