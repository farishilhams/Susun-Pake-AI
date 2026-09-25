"use client";

// ============================================================
// components/chat/GenerateProgress.tsx — Real-time Progress Generate (v2)
//
// Update dari v1:
// - Support prop isError + onRetry (untuk reconnect)
// - Phosphor Icons menggantikan emoji
// - CSS variables menggantikan hardcoded Tailwind colors
// Sesuai ARCHITECTURE.md § 7.1 event contract
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Clock,
  Spinner,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { ArrowRight } from "lucide-react";

interface FileStatus {
  fileType: string;
  status: "waiting" | "in_progress" | "done" | "error";
  content?: string;
}

interface GenerateProgressProps {
  fileStatuses: FileStatus[];
  isDone: boolean;
  isError?: boolean;
  projectId: string;
  onRetry?: () => void;
}

const FILE_DESCRIPTIONS: Record<string, string> = {
  PRD: "Product Requirements Document",
  ARCHITECTURE: "Arsitektur Sistem",
  DESIGN: "Design System & UI",
  CLAUDE: "Context Anchor (CLAUDE/AGENTS)",
  SKILL: "Pola Kode Reusable",
  TODO: "Task Tracker",
  WORKFLOW: "Alur Kerja Development",
  SECURITY: "Checklist Keamanan",
};

const FILE_EMOJIS: Record<string, string> = {
  PRD: "📋",
  ARCHITECTURE: "🏗️",
  DESIGN: "🎨",
  CLAUDE: "🤖",
  SKILL: "⚡",
  TODO: "✅",
  WORKFLOW: "🔄",
  SECURITY: "🛡️",
};

export default function GenerateProgress({
  fileStatuses,
  isDone,
  isError = false,
  projectId,
  onRetry,
}: GenerateProgressProps) {
  const doneCount = fileStatuses.filter((f) => f.status === "done").length;
  const totalCount = fileStatuses.length || 8;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="w-full">
      {/* Header status */}
      <div className="text-center mb-8">
        {isDone ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <CheckCircle size={48} className="mx-auto mb-3" style={{ color: "var(--success)" }} weight="fill" />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
              Dokumentasi Selesai!
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted-fg)" }}>
              8 dokumen spek dan arsitektur project kamu siap dipakai!
            </p>
            <Link
              id="view-files-btn"
              href={`/project/${projectId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              <span>Lihat &amp; Edit File</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </motion.div>
        ) : isError ? (
          <div>
            <XCircle size={40} className="mx-auto mb-3" style={{ color: "var(--destructive)" }} weight="fill" />
            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              Generate gagal
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted-fg)" }}>
              Koneksi terputus setelah beberapa percobaan reconnect.
            </p>
            {onRetry && (
              <button
                id="retry-generate-btn"
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                <ArrowClockwise size={14} />
                Coba Lagi
              </button>
            )}
          </div>
        ) : (
          <div>
            <Spinner size={36} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
              Menyusun dokumentasi...
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-fg)" }}>
              {doneCount} dari {totalCount} file selesai
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isDone && !isError && (
        <div className="h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: "var(--muted)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--primary)" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>
      )}

      {/* File status list */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {fileStatuses.map((file, index) => (
            <motion.div
              key={file.fileType}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="p-4 rounded-xl border transition-all"
              style={{
                background: file.status === "in_progress"
                  ? "color-mix(in srgb, var(--primary) 5%, var(--surface))"
                  : file.status === "done"
                  ? "color-mix(in srgb, var(--success) 5%, var(--surface))"
                  : file.status === "error"
                  ? "color-mix(in srgb, var(--destructive) 5%, var(--surface))"
                  : "var(--surface)",
                borderColor: file.status === "in_progress"
                  ? "color-mix(in srgb, var(--primary) 35%, transparent)"
                  : file.status === "done"
                  ? "color-mix(in srgb, var(--success) 25%, transparent)"
                  : file.status === "error"
                  ? "color-mix(in srgb, var(--destructive) 25%, transparent)"
                  : "var(--border-color)",
              }}
            >
              <div className="flex items-center gap-4">
                {/* Emoji icon (representasi file, bukan navigasi) */}
                <span className="text-xl flex-shrink-0" aria-hidden="true">
                  {FILE_EMOJIS[file.fileType] ?? "📄"}
                </span>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}
                    >
                      {file.fileType}.md
                    </span>
                    {file.status === "in_progress" && (
                      <span className="text-xs flex items-center gap-1" style={{ color: "var(--primary)" }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: "var(--primary)" }}
                        />
                        Sedang diproses...
                      </span>
                    )}
                    {file.status === "done" && (
                      <span className="text-xs" style={{ color: "var(--success)" }}>Selesai</span>
                    )}
                    {file.status === "error" && (
                      <span className="text-xs" style={{ color: "var(--destructive)" }}>Error</span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--muted-fg)" }}>
                    {FILE_DESCRIPTIONS[file.fileType]}
                  </p>
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {file.status === "waiting" && (
                    <Clock size={16} style={{ color: "var(--border-color)" }} />
                  )}
                  {file.status === "in_progress" && (
                    <Spinner size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
                  )}
                  {file.status === "done" && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle size={16} weight="fill" style={{ color: "var(--success)" }} />
                    </motion.div>
                  )}
                  {file.status === "error" && (
                    <XCircle size={16} weight="fill" style={{ color: "var(--destructive)" }} />
                  )}
                </div>
              </div>

              {/* Teks muncul token-by-token seperti mengetik (ARCHITECTURE.md § 7.1) */}
              {file.status === "in_progress" && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950/70 border border-emerald-500/25 text-slate-300 font-mono text-[11px] leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap select-none">
                  {file.content ? (
                    <>
                      <span>{file.content.slice(-350)}</span>
                      <span className="inline-block w-1.5 h-3 bg-emerald-400 ml-1 animate-pulse align-middle" />
                    </>
                  ) : (
                    <span className="text-slate-500 italic">Mempersiapkan prompt & streaming token...</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
