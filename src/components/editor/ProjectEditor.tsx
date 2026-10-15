"use client";

// ============================================================
// components/editor/ProjectEditor.tsx — Split-view Markdown Editor
//
// Layout: Responsive Top Bar | Mobile File Tabs | Sidebar (Desktop) | Editor & Preview
// Fully responsive across Android Phone, iPhone/iOS, iPad/Tablet, Laptop, and Desktop.
//
// Features:
//   - Tab navigasi 8 file (Horizontal scroll di mobile, collapsible sidebar di desktop)
//   - Autosave dengan debounce 1.5 detik (SKILL.md § Autosave)
//   - Responsive View Mode (Preview & Edit di mobile, Split/Editor/Preview di desktop)
//   - Copy to clipboard & Single file download
//   - Download semua sebagai .zip
//   - Live preview dengan react-markdown & Mermaid diagrams
//   - Refinement Chat drawer & GitHub Push Modal & Version History Diff
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
import { MoreVertical } from "lucide-react";
import { downloadSingleFile, downloadAllAsZip, copyToClipboard } from "@/lib/utils/download";
import { FileType } from "@/types";
import {
  GridBackground,
  ThemeToggle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuPortal,
} from "@/components/ui";

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
    <div className="flex-1 flex items-center justify-center text-muted-fg text-xs sm:text-sm p-8">
      <div className="flex items-center gap-2">
        <Spinner size={16} className="animate-spin text-primary" />
        <span>Memuat preview dokumentasi...</span>
      </div>
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
  const [isMobile, setIsMobile] = useState(false);

  // Debounce timer ref untuk autosave
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInProgress = useRef(false);
  const mobileTabContainerRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find((f) => f.fileType === activeFileType);
  const activeContent = activeFile?.content ?? "";

  // Deteksi responsivitas layar untuk default state yang optimal di Android, iOS, Tablet, Laptop, Desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    handleResize();

    // Default mobile UX: tampilkan preview terlebih dahulu dan sembunyikan sidebar desktop permanen
    if (window.innerWidth < 768) {
      setViewMode("preview");
      setSidebarOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      if (saveStatus === "unsaved") {
        saveFile(activeFileType, activeContent);
      }
    }
    setActiveFileType(fileType);
    setSaveStatus("saved");

    // Scroll tab aktif mobile ke tengah secara halus
    setTimeout(() => {
      const activeTabEl = document.getElementById(`mobile-tab-${fileType.toLowerCase()}`);
      activeTabEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 50);
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
      {/* ─── Top Bar Terpadu (Ultra Responsive) ─── */}
      <header
        className="h-14 border-b border-[--border-color] bg-[--surface] flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0 z-30"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)" }}
      >
        {/* Tombol Back & Nama Project */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-surface-hover shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline font-mono">Dashboard</span>
          </Link>
          <span className="text-border text-xs hidden sm:inline">/</span>

          {/* Project name */}
          <span
            className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[120px] xs:max-w-[170px] sm:max-w-xs"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            title={projectName}
          >
            {projectName}
          </span>

          {/* Save status badge */}
          <div className="flex items-center ml-1">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-[11px] text-muted-fg font-mono">
                <Spinner size={12} className="animate-spin text-primary" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-success text-[11px] font-mono" title="Semua perubahan tersimpan">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="hidden sm:inline">Tersimpan</span>
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="flex items-center gap-1 text-warning text-[11px] font-mono" title="Perubahan belum tersimpan">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                <span className="hidden sm:inline">Belum tersimpan</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* View mode segmented toggles */}
        <div className="flex items-center bg-muted/80 rounded-lg p-0.5 border border-border/50 shrink-0">
          {/* Di mobile: tampilkan 2 mode bersih (Preview & Editor) */}
          {/* Di desktop: tampilkan 3 mode (Split, Editor, Preview) */}
          {(isMobile ? (["preview", "editor"] as ViewMode[]) : (["split", "editor", "preview"] as ViewMode[])).map((mode) => {
            const icons = { split: Columns, editor: PencilSimple, preview: Eye };
            const Icon = icons[mode];
            const labels = { split: "Split", editor: "Editor", preview: "Preview" };
            const isActive = viewMode === mode || (isMobile && viewMode === "split" && mode === "preview");

            return (
              <button
                key={mode}
                id={`view-mode-${mode}`}
                type="button"
                onClick={() => setViewMode(mode)}
                title={labels[mode]}
                className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer
                  ${isActive
                    ? "bg-surface text-primary font-semibold shadow-sm border border-border/50"
                    : "text-muted-fg hover:text-foreground hover:bg-surface/50"
                  }
                `}
              >
                <Icon size={13} className={isActive ? "text-primary" : ""} />
                <span className={mode === "split" ? "hidden md:inline" : "hidden sm:inline"}>{labels[mode]}</span>
              </button>
            );
          })}
        </div>

        {/* Tombol Cepat Refine AI (Selalu terlihat baik di mobile maupun desktop) */}
        <button
          id="refine-chat-btn"
          type="button"
          onClick={() => setRefineOpen((p) => !p)}
          title="Refine file via Chat AI"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer shrink-0 ${
            refineOpen
              ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
              : "border-border hover:bg-surface-hover text-foreground hover:border-primary/30"
          }`}
        >
          <ChatText size={14} className={refineOpen ? "text-primary" : "text-muted-fg"} />
          <span className="hidden sm:inline">Refine AI</span>
        </button>

        {/* Action Buttons di Desktop (Tampil di lg+) */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            id="version-history-btn"
            type="button"
            onClick={() => setVersionHistoryOpen(true)}
            title="Riwayat versi & diff rollback"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border hover:bg-surface-hover text-muted-fg hover:text-foreground transition-colors cursor-pointer"
          >
            <ClockCounterClockwise size={13} />
            <span>Riwayat</span>
          </button>

          <button
            id="push-github-btn"
            type="button"
            onClick={() => setGithubPushOpen(true)}
            title="Push 8 file ke GitHub"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border hover:bg-surface-hover text-muted-fg hover:text-foreground transition-colors cursor-pointer"
          >
            <GithubLogo size={13} weight="fill" />
            <span>GitHub</span>
          </button>

          <button
            id="copy-file-btn"
            type="button"
            onClick={handleCopy}
            title="Copy isi file ini ke clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border hover:bg-surface-hover text-muted-fg hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? "Disalin!" : "Salin"}</span>
          </button>

          <button
            id="download-file-btn"
            type="button"
            onClick={() => downloadSingleFile(activeFileType, activeContent)}
            title={`Download ${activeFileType}.md`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border hover:bg-surface-hover text-muted-fg hover:text-foreground transition-colors cursor-pointer"
          >
            <DownloadSimple size={13} />
            <span>{activeFileType}.md</span>
          </button>

          <button
            id="download-zip-btn"
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingZip}
            title="Download semua sebagai .zip"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-60 transition-colors cursor-pointer shadow-sm"
          >
            {downloadingZip ? (
              <Spinner size={13} className="animate-spin" />
            ) : (
              <FileArrowDown size={13} />
            )}
            <span>.zip</span>
          </button>
        </div>

        {/* Theme Toggle di Desktop/Tablet */}
        <div className="hidden sm:block">
          <ThemeToggle className="h-8 w-8 p-1.5 text-xs" />
        </div>

        {/* Desktop Sidebar Toggle */}
        <button
          id="sidebar-toggle-btn"
          type="button"
          onClick={() => setSidebarOpen((p) => !p)}
          title={sidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
          className="hidden md:flex p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-hover border border-transparent hover:border-border transition-colors cursor-pointer"
        >
          <SidebarSimple size={16} />
        </button>

        {/* Menu Aksi Dropdown Mobile (Mencegah overflow & merapikan tampilan mobile) */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                id="mobile-actions-menu-btn"
                type="button"
                title="Opsi & aksi lainnya"
                className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-hover border border-border/60 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-1.5 z-50">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-fg px-2 py-1">
                  Aksi Dokumen ({activeFileType}.md)
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={handleCopy} className="gap-2.5">
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  <span>Salin {activeFileType}.md</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadSingleFile(activeFileType, activeContent)} className="gap-2.5">
                  <DownloadSimple size={14} />
                  <span>Download {activeFileType}.md</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDownloadAll} disabled={downloadingZip} className="gap-2.5">
                  <FileArrowDown size={14} />
                  <span>Download Semua (.zip)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[10px] uppercase text-muted-fg px-2 py-1">
                  Integrasi & Riwayat
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setGithubPushOpen(true)} className="gap-2.5">
                  <GithubLogo size={14} weight="fill" />
                  <span>Push ke GitHub</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setVersionHistoryOpen(true)} className="gap-2.5">
                  <ClockCounterClockwise size={14} />
                  <span>Riwayat & Diff Versi</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRefineOpen(true)} className="gap-2.5">
                  <ChatText size={14} />
                  <span>Refine AI Chat</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5 flex items-center justify-between text-xs text-muted-fg">
                  <span>Tema Tampilan</span>
                  <ThemeToggle className="h-7 w-7 p-1" />
                </div>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Mobile File Tabs Bar (Scrollable Tabs di bawah Header) ─── */}
      <nav
        ref={mobileTabContainerRef}
        aria-label="Dokumen project"
        className="md:hidden border-b border-border px-2 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar scroll-smooth z-20 shrink-0 shadow-xs"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--surface)" }}
      >
        {files.map((file) => {
          const meta = FILE_META[file.fileType];
          const isActive = activeFileType === file.fileType;
          const isDone = Boolean(file.content);

          return (
            <button
              key={file.fileType}
              id={`mobile-tab-${file.fileType.toLowerCase()}`}
              type="button"
              onClick={() => switchTab(file.fileType)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer
                ${isActive
                  ? "bg-primary/15 text-primary border border-primary/40 font-semibold shadow-xs"
                  : "text-muted-fg hover:text-foreground hover:bg-surface-hover border border-transparent"
                }
              `}
            >
              <span className="text-sm">{meta?.icon ?? "📄"}</span>
              <span>{file.fileType}</span>
              {isDone && (
                <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── Main Area (Sidebar Desktop + Editor / Preview) ─── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Sidebar Desktop (Disembunyikan di Mobile, Muncul di md+) ── */}
        {sidebarOpen && (
          <aside
            className="hidden md:flex w-48 lg:w-52 flex-shrink-0 border-r border-border flex-col overflow-y-auto"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-color)" }}
          >
            <div className="p-2 space-y-1">
              {files.map((file) => {
                const meta = FILE_META[file.fileType];
                const isActive = activeFileType === file.fileType;
                const isDone = Boolean(file.content);
                return (
                  <button
                    key={file.fileType}
                    id={`sidebar-tab-${file.fileType.toLowerCase()}`}
                    type="button"
                    onClick={() => switchTab(file.fileType)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all cursor-pointer
                      ${isActive
                        ? "bg-primary/10 text-foreground border border-primary/30 shadow-xs"
                        : "text-muted-fg hover:text-foreground hover:bg-surface-hover border border-transparent"
                      }
                    `}
                  >
                    <span className="text-base">{meta?.icon ?? "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate font-mono ${isActive ? "text-primary" : ""}`}>
                        {file.fileType}
                      </p>
                      <p className="text-[11px] text-muted-fg truncate">{meta?.desc}</p>
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

        {/* ── Editor + Preview Pane (Responsive Full-Width di Mobile) ── */}
        <div className="flex flex-1 overflow-hidden divide-x divide-border">
          {/* Editor Pane: Tampil saat mode editor ATAU mode split di desktop */}
          {((isMobile && viewMode === "editor") || (!isMobile && (viewMode === "editor" || viewMode === "split"))) && (
            <div className="flex flex-col flex-1 w-full overflow-hidden bg-background">
              {/* Editor header */}
              <div
                className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border flex-shrink-0 bg-surface/40"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center gap-2 font-mono text-xs text-muted-fg">
                  <span className="text-foreground font-semibold">{activeFileType}.md</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-muted-fg font-mono">
                  <span>{activeContent.split("\n").length} baris</span>
                  <span>·</span>
                  <span>{activeContent.length} karakter</span>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className="text-primary hover:underline ml-1 font-sans"
                    >
                      Lihat Preview →
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id={`editor-${activeFileType.toLowerCase()}`}
                value={activeContent}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full resize-none bg-background text-foreground p-3 sm:p-4 focus:outline-none text-sm leading-relaxed"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  tabSize: 2,
                  caretColor: "var(--primary)",
                }}
                placeholder={`# ${activeFileType}.md\n\nMulai menulis dokumentasi...`}
              />
            </div>
          )}

          {/* Preview Pane: Tampil saat mode preview ATAU mode split di desktop */}
          {((isMobile && viewMode !== "editor") || (!isMobile && (viewMode === "preview" || viewMode === "split"))) && (
            <div className="flex flex-col flex-1 w-full overflow-hidden bg-background">
              <div
                className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border flex-shrink-0 bg-surface/40"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span className="text-xs text-muted-fg flex items-center gap-1.5 font-mono">
                  <Eye size={12} className="text-primary" />
                  <span>Preview ({activeFileType}.md)</span>
                </span>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setViewMode("editor")}
                    className="text-[11px] text-primary hover:underline font-mono"
                  >
                    Edit File ↗
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <MarkdownPreview content={activeContent} />
              </div>
            </div>
          )}

          {/* Refinement Chat Drawer / Panel */}
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
          <div className="text-center p-6 rounded-2xl bg-surface/90 border border-white/10 shadow-2xl max-w-sm mx-4">
            <Spinner size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-foreground font-semibold text-sm sm:text-base">Sedang generate dokumentasi...</p>
            <p className="text-muted-fg text-xs mt-1">Halaman ini akan terupdate otomatis saat selesai</p>
          </div>
        </div>
      )}
    </GridBackground>
  );
}
