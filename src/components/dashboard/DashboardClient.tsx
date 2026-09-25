"use client";

// ============================================================
// components/dashboard/DashboardClient.tsx — Dashboard Terpadu
// Profil Pengguna (Header Glassmorphism & Modal Edit Profil),
// Upload Avatar (Base64 < 2MB, Zero Re-login NextAuth),
// Riwayat Project, Menu Aksi Titik Tiga, & Toast Notifikasi.
// Sesuai ARCHITECTURE.md § 4 & DESIGN.md § 5.2
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout";
import {
  Folder,
  Plus,
  Sparkles,
  MoreVertical,
  Share2,
  Pin,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
  X,
  Loader2,
  Camera,
  Mail,
  Calendar,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Upload,
  ArrowLeft,
} from "lucide-react";
import {
  GlassPill,
  MagneticButton,
  AuroraBackground,
  GridBackground,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from "@/components/ui";

export interface ProjectItem {
  id: string;
  name: string;
  projectType: string;
  status: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileData {
  id?: string;
  name: string;
  email: string;
  image?: string | null;
  avatar_url?: string | null;
  avatarUrl: string | null;
  createdAt?: string;
  authProvider?: string;
}

interface DashboardClientProps {
  projects: ProjectItem[];
  userName?: string;
  user?: UserProfileData;
  totalFiles?: number;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: "Draft", color: "text-muted-fg", dot: "bg-muted-fg" },
  interviewing: { label: "Wawancara", color: "text-warning", dot: "bg-warning" },
  generating: { label: "Generating", color: "text-primary", dot: "bg-primary" },
  done: { label: "Selesai", color: "text-success", dot: "bg-success" },
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  "web-app": "Web App",
  "mobile-app": "Mobile App",
  "api-service": "API Service",
  saas: "SaaS",
  "cli-tool": "CLI Tool",
  library: "Library",
  game: "Game",
  other: "Lainnya",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatJoinDate(iso?: string): string {
  if (!iso) return "Baru bergabung";
  try {
    const d = new Date(iso);
    return `Bergabung ${d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    })}`;
  } catch {
    return "Baru bergabung";
  }
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return "US";
}

function sortProjects(list: ProjectItem[]): ProjectItem[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export default function DashboardClient({
  projects: initialProjects,
  userName,
  user: initialUser,
  totalFiles = 0,
}: DashboardClientProps) {
  const { data: session, update: updateSession } = useSession();

  // State profil user
  const [userData, setUserData] = useState<UserProfileData>(() => {
    const fallbackAvatar =
      initialUser?.avatar_url ||
      initialUser?.image ||
      initialUser?.avatarUrl ||
      session?.user?.image ||
      (session?.user as { avatar_url?: string | null })?.avatar_url ||
      (session?.user as { avatarUrl?: string | null })?.avatarUrl ||
      null;

    return {
      id: initialUser?.id || session?.user?.id || "",
      name: initialUser?.name || session?.user?.name || userName || "Developer",
      email: initialUser?.email || session?.user?.email || "",
      image: fallbackAvatar,
      avatar_url: fallbackAvatar,
      avatarUrl: fallbackAvatar,
      createdAt: initialUser?.createdAt || new Date().toISOString(),
      authProvider: initialUser?.authProvider || "email",
    };
  });

  // Sinkronkan state profil jika session diperbarui
  useEffect(() => {
    if (session?.user) {
      setUserData((prev) => {
        const sessionImage = session.user?.image;
        const sessionAvatarUrl =
          (session.user as { avatar_url?: string | null })?.avatar_url ||
          (session.user as { avatarUrl?: string | null })?.avatarUrl;
        const nextAvatar =
          sessionImage ||
          sessionAvatarUrl ||
          prev.avatar_url ||
          prev.image ||
          prev.avatarUrl ||
          initialUser?.avatar_url ||
          initialUser?.image ||
          initialUser?.avatarUrl ||
          null;

        return {
          ...prev,
          name: session.user?.name || prev.name,
          email: session.user?.email || prev.email,
          image: nextAvatar,
          avatar_url: nextAvatar,
          avatarUrl: nextAvatar,
        };
      });
    }
  }, [session, initialUser]);

  // Fallback berurutan sesuai ARCHITECTURE & panduan spesifikasi
  const profileImage =
    session?.user?.image ||
    (session?.user as { avatar_url?: string | null })?.avatar_url ||
    (session?.user as { avatarUrl?: string | null })?.avatarUrl ||
    userData?.avatar_url ||
    userData?.image ||
    userData?.avatarUrl ||
    initialUser?.avatar_url ||
    initialUser?.image ||
    initialUser?.avatarUrl ||
    null;

  // Direct fetch fallback jika avatar belum terisi pada sesi in-memory
  useEffect(() => {
    if (!profileImage && (session?.user?.id || userData.id)) {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((resData) => {
          if (resData?.success && resData?.data) {
            const fetchedAvatar = resData.data.avatar_url || resData.data.image;
            if (fetchedAvatar) {
              setUserData((prev) => ({
                ...prev,
                image: fetchedAvatar,
                avatar_url: fetchedAvatar,
                avatarUrl: fetchedAvatar,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [profileImage, session?.user?.id, userData.id]);

  // State modal edit profil
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(userData.name);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileImage);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State project list & menu
  const [projects, setProjects] = useState<ProjectItem[]>(() =>
    sortProjects(initialProjects)
  );
  const [renameTarget, setRenameTarget] = useState<ProjectItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sinkronkan daftar project jika props initialProjects diperbarui
  useEffect(() => {
    setProjects(sortProjects(initialProjects));
  }, [initialProjects]);

  // Tutup modal yang sedang terbuka dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isActionLoading) {
          if (renameTarget) setRenameTarget(null);
          if (deleteTarget) setDeleteTarget(null);
        }
        if (!isSavingProfile && editModalOpen) {
          setEditModalOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [renameTarget, deleteTarget, editModalOpen, isActionLoading, isSavingProfile]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Handler Buka Modal Edit Profil
  const handleOpenEditModal = () => {
    setNameInput(userData.name);
    setAvatarPreview(profileImage);
    setProfileError(null);
    setEditModalOpen(true);
  };

  // Handler Pemilihan File Avatar (Instant Client Preview & Validasi)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validasi Format Gambar
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setProfileError("Format file harus berupa gambar JPG, PNG, atau WEBP.");
      return;
    }

    // 2. Validasi Batasan Ukuran Maksimal (2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setProfileError("Ukuran file foto maksimal 2MB.");
      return;
    }

    setProfileError(null);

    // 3. Baca File sebagai Data URL Base64 (Kompatibel Serverless/Vercel)
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
    };
    reader.onerror = () => {
      setProfileError("Gagal membaca berkas gambar. Silakan coba lagi.");
    };
    reader.readAsDataURL(file);
  };

  // Handler Reset Avatar ke Inisial
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handler Simpan Profil ke API & Sinkronisasi Sesi NextAuth
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      setProfileError("Nama lengkap tidak boleh kosong.");
      return;
    }
    if (nameInput.trim().length < 2) {
      setProfileError("Nama lengkap minimal terdiri dari 2 karakter.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          avatarUrl: avatarPreview,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memperbarui profil pengguna");
      }

      // Ambil URL string pendek dari respon backend (/api/user/avatar?u=...&v=...)
      const returnedAvatarUrl = data.data?.avatarUrl ?? null;

      // Sinkronisasi Sesi NextAuth secara Instan di Client (Zero Re-Login)
      // HANYA mengoper URL pendek (bukan Base64 mentah) untuk mencegah Cookie Overflow / CLIENT_FETCH_ERROR
      await updateSession({
        name: nameInput.trim(),
        image: returnedAvatarUrl,
      });

      // Update State Lokal dengan URL pendek
      setUserData((prev) => ({
        ...prev,
        name: nameInput.trim(),
        avatarUrl: returnedAvatarUrl,
      }));

      showToast("Profil dan foto avatar berhasil diperbarui!", "success");
      setEditModalOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil";
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 1. Aksi: Bagikan Link
  const handleShare = async (project: ProjectItem, e?: React.SyntheticEvent | Event) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    const shareUrl = `${window.location.origin}/project/${project.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      showToast("Tautan project berhasil disalin ke clipboard!", "success");
    } catch (err) {
      console.error("Gagal menyalin tautan:", err);
      showToast("Gagal menyalin tautan ke clipboard", "error");
    }
  };

  // 2. Aksi: Sematkan (Toggle Pin)
  const handleTogglePin = async (project: ProjectItem, e?: React.SyntheticEvent | Event) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    const nextPinned = !project.isPinned;

    // Optimistic UI update — langsung urutkan project yang disematkan ke atas
    setProjects((prev) =>
      sortProjects(
        prev.map((p) => (p.id === project.id ? { ...p, isPinned: nextPinned } : p))
      )
    );

    try {
      // Panggil endpoint /api/projects/[id]/pin dengan fallback ke /api/projects/[id]
      const res = await fetch(`/api/projects/${project.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: nextPinned }),
      });

      if (!res.ok) {
        const fallbackRes = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: nextPinned }),
        });
        if (!fallbackRes.ok) throw new Error("Gagal mengupdate pin status");
      }

      showToast(
        nextPinned ? `Project "${project.name}" disematkan di atas` : `Sematkan project dilepas`,
        "info"
      );
    } catch (err) {
      console.error(err);
      // Revert optimistic update jika gagal
      setProjects((prev) =>
        sortProjects(
          prev.map((p) => (p.id === project.id ? { ...p, isPinned: !nextPinned } : p))
        )
      );
      showToast("Gagal mengubah status sematan project", "error");
    }
  };

  // 3. Aksi: Buka Modal Ganti Nama
  const handleOpenRename = (project: ProjectItem, e?: React.SyntheticEvent | Event) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    setRenameTarget(project);
    setRenameValue(project.name);
  };

  // Konfirmasi Ganti Nama
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!res.ok) throw new Error("Gagal mengubah nama project");

      const newName = renameValue.trim();
      const updatedTimestamp = new Date().toISOString();
      setProjects((prev) =>
        sortProjects(
          prev.map((p) =>
            p.id === renameTarget.id
              ? { ...p, name: newName, updatedAt: updatedTimestamp }
              : p
          )
        )
      );
      showToast(`Nama project berhasil diubah menjadi "${newName}"`, "success");
      setRenameTarget(null);
    } catch (err) {
      console.error(err);
      showToast("Gagal memperbarui nama project", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Aksi: Buka Modal Hapus
  const handleOpenDelete = (project: ProjectItem, e?: React.SyntheticEvent | Event) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    setDeleteTarget(project);
  };

  // Konfirmasi Hapus
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus project");

      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(
        `Project "${deleteTarget.name}" berhasil dihapus secara permanen`,
        "success"
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus project dari database", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const currentInitials = getInitials(userData.name, userData.email);

  return (
    <AuroraBackground intensity="subtle">
      <GridBackground subtle={true} className="min-h-screen">
        {/* Standardized Navbar (Single Source of Truth) */}
        <Navbar />

        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 relative z-10">
          {/* Navigasi Kembali ke Beranda Tunggal (Breadcrumb Action) */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              id="dashboard-back-home-link"
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 bg-surface/50 hover:bg-surface-hover/80 text-xs font-mono text-muted-fg hover:text-foreground transition-all duration-150 backdrop-blur-md group shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          {/* ============================================================ */}
          {/* SEKSI 1: KARTU INFORMASI PROFIL PENGGUNA (CINEMATIC GLASS)    */}
          {/* ============================================================ */}
          <GlassPill
            variant="card"
            className="p-5 sm:p-8 mb-8 sm:mb-10 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden bg-surface/60"
          >
            {/* Ambient Background Radial Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Sisi Kiri: Foto Avatar, Identitas User, & Tombol Aksi (Mobile-First Card Layout) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
                {/* Avatar Lingkaran Besar + Tombol Cepat Kamera */}
                <div className="relative shrink-0 group">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-primary/40 group-hover:border-primary transition-colors bg-surface shadow-xl">
                    <AvatarImage
                      src={profileImage || ""}
                      alt={userData.name || "User Avatar"}
                      className="object-cover"
                    />
                    <AvatarFallback className="w-full h-full bg-slate-800 text-emerald-400 font-mono font-bold text-2xl sm:text-3xl">
                      {currentInitials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Tombol Kamera Cepat */}
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    title="Ubah foto profil"
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-slate-950 hover:bg-primary-hover shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-background"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Info Teks Pengguna (Fluid & Anti-Truncate) */}
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight break-words">
                      {userData.name}
                    </h2>
                    <GlassPill variant="badge" className="text-[11px] font-mono">
                      <CheckCircle2 className="w-3 h-3 text-primary mr-1" />
                      Akun Aktif
                    </GlassPill>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm text-muted-fg font-mono mt-1 break-all">
                    <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                    <span>{userData.email}</span>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-fg font-mono">
                      <Calendar className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                      <span>{formatJoinDate(userData.createdAt)}</span>
                    </div>

                    <MagneticButton
                      id="edit-profile-trigger-btn"
                      onClick={handleOpenEditModal}
                      variant="secondary"
                      strength={0.2}
                      className="px-3 py-1 text-xs font-mono flex items-center gap-1.5 rounded-lg border border-border/80"
                    >
                      <Pencil className="w-3 h-3 text-primary" />
                      <span>Edit Profil</span>
                    </MagneticButton>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Metrik Ringkas Pengguna (Grid Responsif Mobile-First) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <div className="text-lg sm:text-2xl font-bold font-mono text-primary">
                    {projects.length}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-muted-fg mt-0.5 whitespace-nowrap">
                    Project Aktif
                  </div>
                </div>

                <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <div className="text-lg sm:text-2xl font-bold font-mono text-foreground">
                    {totalFiles > 0 ? totalFiles : projects.length * 8}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-muted-fg mt-0.5 whitespace-nowrap">
                    Dokumen Spek
                  </div>
                </div>

                <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-400">
                    Penuh
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-muted-fg mt-0.5 whitespace-nowrap">
                    Akses Gratis
                  </div>
                </div>
              </div>
            </div>
          </GlassPill>

          {/* ============================================================ */}
          {/* SEKSI 2: RIWAYAT & MANAJEMEN PROJECT                         */}
          {/* ============================================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="text-xl sm:text-3xl font-bold text-foreground font-mono"
                >
                  Project Kamu
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface border border-white/10 text-muted-fg font-mono">
                  {projects.length} project
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-fg leading-relaxed">
                {projects.length === 0
                  ? "Belum ada project aktif — yuk mulai bikin rancangan project pertama kamu!"
                  : "Kelola 8 file dokumentasi dan arsitektur untuk setiap project."}
              </p>
            </div>

            <MagneticButton
              id="new-project-btn"
              href="/new-project"
              variant="primary"
              strength={0.25}
              className="w-full sm:w-auto px-5 py-2.5 font-mono text-xs sm:text-sm text-slate-950 font-semibold shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Project Baru</span>
            </MagneticButton>
          </div>

          {/* Daftar Kartu Project */}
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-surface/30 backdrop-blur-md p-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mx-auto mb-4 text-primary shadow-inner">
                <Folder className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-foreground font-mono mb-2">
                Belum ada project
              </h2>
              <p className="text-muted-fg text-xs sm:text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                Mau bikin apa hari ini? Susun 8 dokumen spek dan arsitektur
                project kamu dalam hitungan menit, langsung siap koding.
              </p>
              <MagneticButton
                id="empty-new-project-btn"
                href="/new-project"
                variant="primary"
                strength={0.3}
                className="px-6 py-3 font-mono text-xs text-primary-fg font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Project Pertama</span>
              </MagneticButton>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {projects.map((project) => {
                  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                  const href =
                    project.status === "draft" || project.status === "interviewing"
                      ? `/project/${project.id}/interview`
                      : `/project/${project.id}`;

                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="relative group"
                    >
                      <GlassPill
                        variant="card"
                        className={`p-5 border-white/10 group-hover:border-primary/50 transition-all bg-surface/60 relative ${
                          project.isPinned ? "border-primary/30 bg-surface/80" : ""
                        }`}
                      >
                        {/* Stretched Link: Navigasi kartu penuh yang mematuhi spesifikasi HTML5 tanpa button di dalam anchor */}
                        <Link
                          id={`project-card-${project.id}`}
                          href={href}
                          className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                          aria-label={`Buka project ${project.name}`}
                        />

                        <div className="flex items-start justify-between gap-4 relative z-10 pointer-events-none">
                          <div className="flex-1 min-w-0 pr-4 pointer-events-auto">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              {project.isPinned && (
                                <span
                                  title="Disematkan di atas"
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25"
                                >
                                  <Pin className="w-3 h-3 fill-primary/30" />
                                  <span>Pinned</span>
                                </span>
                              )}
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors font-mono text-base truncate">
                                {project.name}
                              </h3>
                              <GlassPill variant="badge" className="text-[10px]">
                                {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
                              </GlassPill>
                            </div>
                            <p className="text-xs text-muted-fg font-mono">
                              Diperbarui {formatDate(project.updatedAt)}
                            </p>
                          </div>

                          {/* Status badge & More Menu container */}
                          <div className="flex items-center gap-3 shrink-0 pointer-events-auto">
                            <GlassPill variant="badge" className={`shrink-0 ${statusCfg.color}`}>
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${
                                  project.status === "generating" ? "animate-pulse" : ""
                                }`}
                              />
                              <span className="text-[11px] font-mono">{statusCfg.label}</span>
                            </GlassPill>

                            {/* Tombol Aksi Titik Tiga (Radix DropdownMenuPortal Anti-Clipping) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  id={`project-menu-btn-${project.id}`}
                                  type="button"
                                  title="Menu opsi project"
                                  className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface border border-transparent hover:border-white/10 transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-primary/40 relative z-20"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuContent
                                  align="end"
                                  sideOffset={6}
                                  className="z-50 min-w-[170px] rounded-xl border border-white/15 bg-[#0F172A]/95 p-1.5 shadow-2xl backdrop-blur-xl font-mono text-xs"
                                >
                                  {/* Aksi 1: Bagikan Link */}
                                  <DropdownMenuItem
                                    onSelect={() => handleShare(project)}
                                    className="cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-primary mr-2" />
                                    <span>Bagikan Link</span>
                                  </DropdownMenuItem>

                                  {/* Aksi 2: Sematkan (Toggle Pin) */}
                                  <DropdownMenuItem
                                    onSelect={() => handleTogglePin(project)}
                                    className="cursor-pointer"
                                  >
                                    <Pin
                                      className={`w-3.5 h-3.5 mr-2 ${
                                        project.isPinned ? "fill-primary text-primary" : "text-primary"
                                      }`}
                                    />
                                    <span>{project.isPinned ? "Lepas Sematan" : "Sematkan"}</span>
                                  </DropdownMenuItem>

                                  {/* Aksi 3: Ganti Nama */}
                                  <DropdownMenuItem
                                    onSelect={() => handleOpenRename(project)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-amber-400 mr-2" />
                                    <span>Ganti Nama</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="my-1 bg-white/10" />

                                  {/* Aksi 4: Hapus Project */}
                                  <DropdownMenuItem
                                    onSelect={() => handleOpenDelete(project)}
                                    className="cursor-pointer text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 focus:text-rose-300 focus:bg-rose-500/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    <span>Hapus Project</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenuPortal>
                            </DropdownMenu>
                          </div>
                        </div>
                      </GlassPill>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL EDIT PROFIL PENGGUNA (INTERAKTIF & UPLOAD AVATAR)       */}
          {/* ============================================================ */}
          <AnimatePresence>
            {editModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md cursor-pointer"
                onClick={() => !isSavingProfile && setEditModalOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface/95 p-6 shadow-2xl backdrop-blur-2xl cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-mono font-bold text-base text-foreground flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-primary" />
                      <span>Edit Profil Pengguna</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                      disabled={isSavingProfile}
                      className="p-1 text-muted-fg hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {profileError && (
                    <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-rose-300 text-xs font-mono mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-5 font-mono">
                    {/* Area Upload Avatar */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-2">
                        Foto Profil (Avatar)
                      </label>
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-white/10">
                        {/* Avatar Preview */}
                        <Avatar className="w-16 h-16 border border-primary/40 shrink-0 bg-surface shadow-inner">
                          <AvatarImage
                            src={avatarPreview || ""}
                            alt="Pratinjau Avatar"
                            className="object-cover"
                          />
                          <AvatarFallback className="w-full h-full bg-slate-800 text-emerald-400 font-mono font-bold text-lg">
                            {getInitials(nameInput, userData.email)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Kontrol Upload / Reset */}
                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                            id="avatar-file-input"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-foreground text-xs font-medium border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-primary" />
                              <span>Pilih Foto</span>
                            </button>

                            {avatarPreview && (
                              <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                              >
                                Hapus Foto
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-fg leading-tight">
                            Format JPG, PNG, atau WEBP. Maksimal 2MB.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Nama Lengkap */}
                    <div>
                      <label
                        htmlFor="profile-name-input"
                        className="block text-xs font-semibold text-foreground/80 mb-1.5"
                      >
                        Nama Lengkap
                      </label>
                      <input
                        id="profile-name-input"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Masukkan nama lengkap kamu"
                        maxLength={60}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background/80 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label
                        htmlFor="profile-email-readonly"
                        className="block text-xs font-semibold text-foreground/80 mb-1.5"
                      >
                        Alamat Email
                      </label>
                      <input
                        id="profile-email-readonly"
                        type="email"
                        value={userData.email}
                        readOnly
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface/40 border border-border/50 text-muted-fg text-xs font-mono cursor-not-allowed select-none"
                      />
                      <p className="text-[10px] text-muted-fg/70 mt-1">
                        Email ditautkan dengan sistem autentikasi akun.
                      </p>
                    </div>

                    {/* Tombol Aksi Modal */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditModalOpen(false)}
                        disabled={isSavingProfile}
                        className="px-4 py-2 rounded-xl text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingProfile || !nameInput.trim()}
                        className="px-5 py-2 rounded-xl bg-primary text-slate-950 font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-md"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <span>Simpan Perubahan</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* MODAL GANTI NAMA PROJECT                                     */}
          {/* ============================================================ */}
          <AnimatePresence>
            {renameTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
                onClick={() => !isActionLoading && setRenameTarget(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md rounded-2xl border border-white/15 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono font-bold text-base text-foreground flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-400" />
                      <span>Ganti Nama Project</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setRenameTarget(null)}
                      className="p-1 text-muted-fg hover:text-foreground rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmRename}>
                    <p className="text-xs text-muted-fg mb-3 font-mono">
                      Masukkan nama baru untuk project ini:
                    </p>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      placeholder="Nama project..."
                      maxLength={200}
                      autoFocus
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background/80 border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary mb-5"
                    />

                    <div className="flex items-center justify-end gap-3 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setRenameTarget(null)}
                        disabled={isActionLoading}
                        className="px-4 py-2 rounded-lg text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isActionLoading || !renameValue.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-slate-950 font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-md"
                      >
                        {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Simpan Perubahan</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* MODAL HAPUS PROJECT (KONFIRMASI BAHAYA)                      */}
          {/* ============================================================ */}
          <AnimatePresence>
            {deleteTarget && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
                onClick={() => !isActionLoading && setDeleteTarget(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md rounded-2xl border border-destructive/30 bg-[#0F172A] p-6 shadow-2xl cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 text-destructive mb-3">
                    <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/25">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="font-mono font-bold text-base text-foreground">
                      Hapus Project Permanen?
                    </h3>
                  </div>

                  <p className="text-xs text-muted-fg leading-relaxed mb-6 font-mono">
                    Apakah kamu yakin ingin menghapus project{" "}
                    <strong className="text-foreground">"{deleteTarget.name}"</strong>?
                    Seluruh 8 dokumen spesifikasi, riwayat versi snapshot, dan arsip interview
                    akan dihapus dari basis data secara permanen dan tidak dapat dipulihkan.
                  </p>

                  <div className="flex items-center justify-end gap-3 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(null)}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-lg text-muted-fg hover:text-foreground transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-lg bg-destructive text-white font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm cursor-pointer"
                    >
                      {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Ya, Hapus Permanen</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* TOAST NOTIFIKASI DINAMIS                                     */}
          {/* ============================================================ */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-mono ${
                    toast.type === "error"
                      ? "bg-destructive/95 border-destructive text-white"
                      : toast.type === "info"
                      ? "bg-surface/95 border-primary/40 text-foreground"
                      : "bg-[#064E3B]/95 border-emerald-500/50 text-white"
                  }`}
                >
                  {toast.type === "success" && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />}
                  {toast.type === "info" && <Pin className="w-4 h-4 text-primary shrink-0" />}
                  <span>{toast.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </main>
      </GridBackground>
    </AuroraBackground>
  );
}
