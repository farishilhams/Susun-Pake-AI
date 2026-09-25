"use client";

// ============================================================
// components/editor/ProjectEditor.tsx — Split-view Markdown Editor
//
// Layout: Sidebar (tab 8 file) | Editor textarea | Markdown Preview
// Features:
//   - Tab navigasi 8 file
//   - Autosave dengan debounce 1.5 detik (SKILL.md § Autosave)
//   - Copy to clipboard per file
//   - Download file tunggal
//   - Download semua sebagai .zip
//   - Live preview dengan react-markdown
//
// Sesuai MASTER.md: IBM Plex Sans body, JetBrains Mono code
// Phosphor Icons (bukan emoji) sesuai ui-ux-pro-max checklist
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  DownloadSimple,
  FileArrowDown,
  SidebarSimple,
  Eye,
  PencilSimple,
  Columns,
  Spinner,
  ChatText,
  ClockCounterClockwise,
  GithubLogo,
} from "@phosphor-icons/react";
import { downloadSingleFile, downloadAllAsZip, copyToClipboard } from "@/lib/utils/download";
import { FileType } from "@/types";
import { GridBackground, ThemeToggle } from "@/components/ui";

// Lazy load modals & components
const VersionHistoryModal = dynamic(() => import("./VersionHistoryModal"), {
  ssr: false,
});
const GitHubPushModal = dynamic(() => import("./GitHubPushModal"), {
  ssr: false,
});

// Lazy load markdown preview dan refinement chat
const MarkdownPreview = dynamic(() => import("./MarkdownPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted-fg text-sm">
      Memuat preview...
    </div>
  ),
});

const RefinementChat = dynamic(() => import("./RefinementChat"), {
  ssr: false,
});

interface FileData {
  fileType: string;
  content: string;
}

interface ProjectEditorProps {
  projectId: string;
  projectName: string;
  files: FileData[];
  isGenerating?: boolean;
}

type ViewMode = "split" | "editor" | "preview";

const FILE_META: Record<string, { icon: string; desc: string }> = {
  PRD: { icon: "📋", desc: "Requirements" },
  ARCHITECTURE: { icon: "🏗️", desc: "Arsitektur" },
  DESIGN: { icon: "🎨", desc: "Design System" },
  CLAUDE: { icon: "🤖", desc: "Context Anchor" },
  SKILL: { icon: "⚡", desc: "Pola Kode" },
  TODO: { icon: "✅", desc: "Task Tracker" },
  WORKFLOW: { icon: "🔄", desc: "Workflow" },
  SECURITY: { icon: "🛡️", desc: "Keamanan" },
};

export default function ProjectEditor({
  projectId,
  projectName,
  files: initialFiles,
  isGenerating = false,
}: ProjectEditorProps) {
  // State
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [activeFileType, setActiveFileType] = useState<string>(initialFiles[0]?.fileType ?? "PRD");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [githubPushOpen, setGithubPushOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  // Debounce timer ref untuk autosave
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInProgress = useRef(false);

  const activeFile = files.find((f) => f.fileType === activeFileType);
  const activeContent = activeFile?.content ?? "";

  // Autosave ke API dengan debounce 1.5 detik (SKILL.md § Autosave)
  const saveFile = useCallback(
    async (fileType: string, content: string) => {
      if (saveInProgress.current) return;
      saveInProgress.current = true;
      setSaveStatus("saving");

      try {
        await fetch(`/api/projects/${projectId}/files`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType, content }),
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      } finally {
        saveInProgress.current = false;
      }
    },
    [projectId]
  );

  const handleContentChange = (newContent: string) => {
    // Update state lokal segera
    setFiles((prev) =>
      prev.map((f) => (f.fileType === activeFileType ? { ...f, content: newContent } : f))
    );
    setSaveStatus("unsaved");

    // Debounce autosave
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveFile(activeFileType, newContent);
    }, 1500);
  };

  // Simpan saat user pindah tab (flush pending save)
  const switchTab = (fileType: string) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      // Simpan segera jika ada perubahan unsaved
      if (saveStatus === "unsaved") {
        saveFile(activeFileType, activeContent);
      }
    }
    setActiveFileType(fileType);
    setSaveStatus("saved");
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const ok = await copyToClipboard(activeContent);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Update file dari refinement (live, tanpa refresh)
  const handleFileUpdatedFromRefine = (fileType: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.fileType === fileType ? { ...f, content } : f))
    );
    // Auto-pindah ke file yang baru diupdate
    setActiveFileType(fileType);
    setSaveStatus("saved"); // sudah disimpan oleh server
  };

  // Download semua file sebagai ZIP
  const handleDownloadAll = async () => {
    setDownloadingZip(true);
    await downloadAllAsZip(projectName, files);
    setDownloadingZip(false);
  };

  // Cleanup timer saat unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <GridBackground subtle={true} className="min-h-screen flex flex-col bg-background" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* ─── Top Bar ─── */}
      <header
        className="h-12 border-b border-[--border-color] bg-[--surface] flex items-center px-4 gap-3 flex-shrink-0"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)" }}
      >
        {/* Back */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <span className="text-border">/</span>

        {/* Project name */}
        <span className="text-sm font-medium text-foreground truncate max-w-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {projectName}
        </span>

        <div className="flex-1" />

        {/* Save status */}
        <span className="text-xs text-muted-fg">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1">
              <Spinner size={12} className="animate-spin" />
              Menyimpan...
            </span>
          )}
          {saveStatus === "saved" && <span className="text-success text-xs">✓ Tersimpan</span>}
          {saveStatus === "unsaved" && <span className="text-warning text-xs">● Belum tersimpan</span>}
        </span>

        {/* View mode toggles */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {(["split", "editor", "preview"] as ViewMode[]).map((mode) => {
            const icons = { split: Columns, editor: PencilSimple, preview: Eye };
            const Icon = icons[mode];
            const labels = { split: "Split", editor: "Editor", preview: "Preview" };
            return (
              <button
                key={mode}
                id={`view-mode-${mode}`}
                type="button"
                onClick={() => setViewMode(mode)}
                title={labels[mode]}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                  ${viewMode === mode
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-fg hover:text-foreground"
                  }
                `}
              >
                <Icon size={13} />
                <span className="hidden sm:block">{labels[mode]}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <button
          id="version-history-btn"
          type="button"
          onClick={() => setVersionHistoryOpen(true)}
          title="Riwayat versi & diff rollback"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <ClockCounterClockwise size={13} />
          <span className="hidden sm:block">Riwayat</span>
        </button>

        <button
          id="push-github-btn"
          type="button"
          onClick={() => setGithubPushOpen(true)}
          title="Push 8 file ke GitHub"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <GithubLogo size={13} weight="fill" />
          <span className="hidden sm:block">GitHub</span>
        </button>

        <button
          id="refine-chat-btn"
          type="button"
          onClick={() => setRefineOpen((p) => !p)}
          title="Refine file via chat AI"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            refineOpen ? "border-primary/50 bg-primary/10" : "border-border hover:bg-surface-hover"
          }`}
        >
          <ChatText size={13} style={{ color: refineOpen ? "var(--primary)" : undefined }} />
          <span className="hidden sm:block">Refine</span>
        </button>

        <button
          id="copy-file-btn"
          type="button"
          onClick={handleCopy}
          title="Copy ke clipboard"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface-hover transition-colors"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          <span className="hidden sm:block">{copied ? "Tersalin!" : "Copy"}</span>
        </button>

        <button
          id="download-file-btn"
          type="button"
          onClick={() => downloadSingleFile(activeFileType, activeContent)}
          title={`Download ${activeFileType}.md`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface-hover transition-colors"
        >
          <DownloadSimple size={13} />
          <span className="hidden sm:block">{activeFileType}.md</span>
        </button>

        <button
          id="download-zip-btn"
          type="button"
          onClick={handleDownloadAll}
          disabled={downloadingZip}
          title="Download semua sebagai .zip"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {downloadingZip ? (
            <Spinner size={13} className="animate-spin" />
          ) : (
            <FileArrowDown size={13} />
          )}
          <span className="hidden sm:block">Download .zip</span>
        </button>

        <ThemeToggle className="h-7 w-7 p-1 text-xs" />

        <button
          id="sidebar-toggle-btn"
          type="button"
          onClick={() => setSidebarOpen((p) => !p)}
          title="Toggle sidebar"
          className="p-1.5 rounded text-muted-fg hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <SidebarSimple size={15} />
        </button>
      </header>

      {/* ─── Main Area ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside
            className="w-44 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)" }}
          >
            <div className="p-2">
              {files.map((file) => {
                const meta = FILE_META[file.fileType];
                const isActive = activeFileType === file.fileType;
                const isDone = !!file.content;
                return (
                  <button
                    key={file.fileType}
                    id={`sidebar-tab-${file.fileType.toLowerCase()}`}
                    type="button"
                    onClick={() => switchTab(file.fileType)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1 text-left transition-all
                      ${isActive
                        ? "bg-primary/10 text-foreground border border-primary/30"
                        : "text-muted-fg hover:text-foreground hover:bg-surface-hover border border-transparent"
                      }
                    `}
                  >
                    <span className="text-base">{meta?.icon ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : ""}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {file.fileType}
                      </p>
                      <p className="text-xs text-muted-fg truncate">{meta?.desc}</p>
                    </div>
                    {isDone && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* ── Editor + Preview Pane ── */}
        <div className="flex flex-1 overflow-hidden divide-x divide-border">
          {/* Editor */}
          {(viewMode === "editor" || viewMode === "split") && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Editor header */}
              <div
                className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span className="text-xs text-muted-fg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {activeFileType}.md
                </span>
                <span className="text-xs text-muted-fg">
                  {activeContent.split("\n").length} baris · {activeContent.length} karakter
                </span>
              </div>

              <textarea
                id={`editor-${activeFileType.toLowerCase()}`}
                value={activeContent}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full resize-none bg-background text-foreground p-4 focus:outline-none text-sm leading-relaxed"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  tabSize: 2,
                  caretColor: "var(--primary)",
                }}
                placeholder={`# ${activeFileType}.md\n\nMulai menulis...`}
              />
            </div>
          )}

          {/* Preview */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div
                className="flex items-center px-4 py-2 border-b border-border flex-shrink-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span className="text-xs text-muted-fg flex items-center gap-1.5">
                  <Eye size={12} />
                  Preview
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MarkdownPreview content={activeContent} />
              </div>
            </div>
          )}

          {/* Refinement Chat panel */}
          <RefinementChat
            projectId={projectId}
            activeFileType={activeFileType}
            onFileUpdated={handleFileUpdatedFromRefine}
            isOpen={refineOpen}
            onClose={() => setRefineOpen(false)}
          />

          {/* Version History & Diff Modal */}
          <VersionHistoryModal
            projectId={projectId}
            fileType={activeFileType as FileType}
            currentContent={activeContent}
            currentVersion={currentVersion}
            isOpen={versionHistoryOpen}
            onClose={() => setVersionHistoryOpen(false)}
            onRollbackSuccess={(newContent, newVersion) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.fileType === activeFileType ? { ...f, content: newContent } : f
                )
              );
              setCurrentVersion(newVersion);
            }}
          />

          {/* Push to GitHub Modal */}
          <GitHubPushModal
            projectId={projectId}
            projectName={projectName}
            isOpen={githubPushOpen}
            onClose={() => setGithubPushOpen(false)}
          />
        </div>
      </div>

      {/* Generating overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-foreground font-medium">Sedang generate dokumentasi...</p>
            <p className="text-muted-fg text-sm mt-1">Halaman ini akan terupdate otomatis</p>
          </div>
        </div>
      )}
    </GridBackground>
  );
}
