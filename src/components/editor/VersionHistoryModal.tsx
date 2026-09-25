"use client";

// ============================================================
// components/editor/VersionHistoryModal.tsx
// Dialog Riwayat Versi & Rollback dengan visualizer Diff
// ============================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockCounterClockwise,
  X,
  ArrowUUpLeft,
  GitCommit,
  Spinner,
  Check,
} from "@phosphor-icons/react";
import DiffViewer from "./DiffViewer";
import { FileType } from "@/types";

interface VersionItem {
  version: number;
  changeType: "initial" | "manual" | "refinement" | "rollback";
  summary: string;
  createdAt: string;
}

interface VersionHistoryModalProps {
  projectId: string;
  fileType: FileType;
  currentContent: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onRollbackSuccess: (newContent: string, newVersion: number) => void;
}

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  initial: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  manual: {
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    border: "border-slate-500/20",
  },
  refinement: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  rollback: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
};

export default function VersionHistoryModal({
  projectId,
  fileType,
  currentContent,
  currentVersion,
  isOpen,
  onClose,
  onRollbackSuccess,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);

  // Fetch list of versions whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    setRollbackSuccessMsg(null);
    setLoadingList(true);
    fetch(`/api/projects/${projectId}/files/versions?fileType=${fileType}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setVersions(json.data);
          // Default select the latest previous version if available
          if (json.data.length > 0) {
            const first = json.data[0].version;
            setSelectedVersion(first);
          }
        }
      })
      .catch((err) => console.error("Error fetching versions list:", err))
      .finally(() => setLoadingList(false));
  }, [isOpen, projectId, fileType]);

  // Fetch content of selected version
  useEffect(() => {
    if (!isOpen || selectedVersion === null) return;

    setLoadingContent(true);
    fetch(
      `/api/projects/${projectId}/files/versions?fileType=${fileType}&version=${selectedVersion}`
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSelectedContent(json.data.content || "");
        }
      })
      .catch((err) => console.error("Error fetching version content:", err))
      .finally(() => setLoadingContent(false));
  }, [isOpen, projectId, fileType, selectedVersion]);

  // Handle Rollback action
  const handleRollback = async () => {
    if (selectedVersion === null || rollbackLoading) return;

    const confirmMsg = `Kembalikan ${fileType}.md ke versi v${selectedVersion}? Perubahan saat ini akan dicatat sebagai riwayat baru.`;
    if (!window.confirm(confirmMsg)) return;

    setRollbackLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType,
          targetVersion: selectedVersion,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setRollbackSuccessMsg(`Berhasil dikembalikan ke v${selectedVersion}`);
        onRollbackSuccess(json.data.content, json.data.version);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        alert(json.message || "Gagal melakukan rollback");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat melakukan rollback");
    } finally {
      setRollbackLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ClockCounterClockwise size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 font-mono">
                Riwayat Versi — {fileType}.md
              </h2>
              <p className="text-xs text-slate-400">
                Versi aktif saat ini: v{currentVersion}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Split 2 Kolom (List Versi & Diff Viewer) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Kolom Kiri: Daftar Versi */}
          <div className="w-72 border-r border-slate-800 bg-slate-900/60 overflow-y-auto flex flex-col divide-y divide-slate-800/60">
            <div className="p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/80">
              Pilih Versi Riwayat
            </div>

            {loadingList ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <Spinner size={16} className="animate-spin text-emerald-400" />
                <span className="text-xs">Memuat riwayat...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                Belum ada rekaman riwayat untuk file ini.
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion === ver.version;
                const isCurrent = ver.version === currentVersion;
                const badge = BADGE_COLORS[ver.changeType] || BADGE_COLORS.manual;

                return (
                  <button
                    key={ver.version}
                    type="button"
                    onClick={() => setSelectedVersion(ver.version)}
                    className={`p-3 text-left transition-colors flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-slate-800 border-l-2 border-emerald-400"
                        : "hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-slate-100 flex items-center gap-1.5">
                        <GitCommit size={14} className="text-slate-400" />
                        v{ver.version}
                        {isCurrent && (
                          <span className="text-[10px] text-emerald-400 font-normal">
                            (aktif)
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {ver.changeType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 truncate">
                      {ver.summary || "Revisi file"}
                    </p>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ver.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Kolom Kanan: Diff Viewer */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-950">
            {loadingContent ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                <Spinner size={20} className="animate-spin text-emerald-400" />
                <span className="text-sm">Memuat konten versi v{selectedVersion}...</span>
              </div>
            ) : selectedVersion === null ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Pilih versi di sebelah kiri untuk melihat perbedaan (diff).
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    Membandingkan <strong className="text-slate-100 font-mono">v{selectedVersion}</strong> dengan versi aktif saat ini (<strong className="text-emerald-400 font-mono">v{currentVersion}</strong>)
                  </div>

                  {rollbackSuccessMsg ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <Check size={14} weight="bold" />
                      <span>{rollbackSuccessMsg}</span>
                    </div>
                  ) : (
                    selectedVersion !== currentVersion && (
                      <button
                        type="button"
                        onClick={handleRollback}
                        disabled={rollbackLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        {rollbackLoading ? (
                          <Spinner size={14} className="animate-spin" />
                        ) : (
                          <ArrowUUpLeft size={14} weight="bold" />
                        )}
                        <span>Kembalikan ke v{selectedVersion}</span>
                      </button>
                    )
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <DiffViewer
                    oldText={selectedContent}
                    newText={currentContent}
                    oldLabel={`Versi v${selectedVersion}`}
                    newLabel={`Versi Aktif (v${currentVersion})`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
