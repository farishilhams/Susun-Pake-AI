"use client";

// ============================================================
// components/editor/GitHubPushModal.tsx
// Dialog Push 8 File ke Repositori GitHub
// Sesuai SECURITY.md § 6: token terenkripsi, scope repo minimal
// ============================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GithubLogo,
  X,
  Spinner,
  CheckCircle,
  GitBranch,
  Folder,
  ArrowSquareOut,
  Plus,
} from "@phosphor-icons/react";

interface RepoItem {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
}

interface GitHubPushModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GitHubPushModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: GitHubPushModalProps) {
  // Status koneksi GitHub
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  // Repositories
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  // Mode: select existing vs create new
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRepoName, setNewRepoName] = useState(
    projectName.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
  );
  const [newRepoDesc, setNewRepoDesc] = useState("Project specification and architecture foundation");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  // Push config
  const [branch, setBranch] = useState("main");
  const [folderPath, setFolderPath] = useState("");
  const [commitMessage, setCommitMessage] = useState(
    "docs: add project specification and architecture foundation via Susun Pake AI"
  );

  // Push execution
  const [pushing, setPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<{
    commitUrl: string;
    repoUrl: string;
    filesPushed: number;
  } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // Check connection status
  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/auth/github/status");
      const json = await res.json();
      if (res.ok && json.success) {
        setIsConnected(Boolean(json.data.connected));
        setGithubUsername(json.data.username);
        if (json.data.connected) {
          fetchRepos();
        }
      }
    } catch (err) {
      console.error("Error checking GitHub status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Fetch repositories
  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setRepos(json.data);
        if (json.data.length > 0 && !selectedRepo) {
          setSelectedRepo(json.data[0].fullName);
          setBranch(json.data[0].defaultBranch || "main");
        }
      }
    } catch (err) {
      console.error("Error fetching GitHub repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPushSuccess(null);
      setPushError(null);
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle repository selection change
  const handleRepoChange = (fullName: string) => {
    setSelectedRepo(fullName);
    const found = repos.find((r) => r.fullName === fullName);
    if (found?.defaultBranch) {
      setBranch(found.defaultBranch);
    }
  };

  // Handle create new repository
  const handleCreateNewRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    setCreatingRepo(true);
    setPushError(null);
    try {
      const res = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDesc,
          isPrivate: newRepoPrivate,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const createdRepo: RepoItem = json.data;
        setRepos((prev) => [createdRepo, ...prev]);
        setSelectedRepo(createdRepo.fullName);
        setBranch(createdRepo.defaultBranch || "main");
        setIsCreatingNew(false);
      } else {
        setPushError(json.message || "Gagal membuat repositori baru di GitHub");
      }
    } catch {
      setPushError("Terjadi kesalahan jaringan saat membuat repositori");
    } finally {
      setCreatingRepo(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm("Putuskan tautan akun GitHub dari Susun Pake AI?")) return;
    try {
      await fetch("/api/auth/github/status", { method: "DELETE" });
      setIsConnected(false);
      setGithubUsername(null);
      setRepos([]);
    } catch (err) {
      console.error("Error disconnecting GitHub:", err);
    }
  };

  // Handle Push Submit
  const handlePushSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || pushing) return;

    setPushing(true);
    setPushError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/github/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: selectedRepo,
          branch: branch.trim() || "main",
          folderPath: folderPath.trim(),
          commitMessage: commitMessage.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPushSuccess({
          commitUrl: json.data.commitUrl,
          repoUrl: json.data.repoUrl,
          filesPushed: json.data.filesPushed || 8,
        });
      } else {
        setPushError(json.message || "Gagal melakukan commit ke GitHub");
      }
    } catch {
      setPushError("Terjadi kesalahan jaringan saat melakukan push");
    } finally {
      setPushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100">
              <GithubLogo size={20} weight="fill" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Push ke GitHub Repository
              </h2>
              <p className="text-xs text-slate-400">
                Commit 8 dokumen spek dan arsitektur project langsung ke repository
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {checkingStatus ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Spinner size={20} className="animate-spin text-emerald-400" />
              <span className="text-sm">Memeriksa status GitHub...</span>
            </div>
          ) : !isConnected ? (
            /* State: Belum terhubung ke GitHub */
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-200">
                <GithubLogo size={36} weight="fill" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">
                  Hubungkan Akun GitHub
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Otorisasikan Susun Pake AI untuk membuat commit 8 file
                  dokumentasi ke repositori GitHub pilihan Anda.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-left text-[11px] text-slate-400 space-y-1 max-w-sm mx-auto">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  🛡️ Jaminan Keamanan (SECURITY.md):
                </p>
                <p>• Scope dibatasi hanya pada akses repository (<code className="text-emerald-400">repo</code>).</p>
                <p>• Token disimpan terenkripsi dengan algoritma <code className="text-emerald-400">AES-256-GCM</code> di database.</p>
              </div>

              <div className="pt-2">
                <a
                  id="connect-github-btn"
                  href={`/api/auth/github/connect?returnUrl=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.pathname : "/dashboard"
                  )}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm rounded-xl transition-colors shadow-sm"
                >
                  <GithubLogo size={18} weight="fill" />
                  <span>Hubungkan dengan GitHub</span>
                </a>
              </div>
            </div>
          ) : pushSuccess ? (
            /* State: Push Sukses */
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle size={36} weight="fill" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-1">
                  Berhasil Di-push ke GitHub!
                </h3>
                <p className="text-xs text-slate-300">
                  {pushSuccess.filesPushed} file dokumentasi telah di-commit ke repositori Anda.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a
                  href={pushSuccess.commitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <span>Lihat Commit di GitHub</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            /* State: Form Konfigurasi Push */
            <div className="space-y-5">
              {/* Account badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <GithubLogo size={16} weight="fill" />
                  <span>
                    Terhubung sebagai: <strong>@{githubUsername}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Putuskan Tautan
                </button>
              </div>

              {pushError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
                  {pushError}
                </div>
              )}

              {/* Mode switch: existing vs new */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Repositori Tujuan
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew((prev) => !prev)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isCreatingNew ? "Pilih Repo yang Ada" : "+ Buat Repo Baru"}
                </button>
              </div>

              {isCreatingNew ? (
                /* Form Buat Repo Baru */
                <form
                  onSubmit={handleCreateNewRepo}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Nama Repository Baru
                    </label>
                    <input
                      type="text"
                      required
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="nama-repository"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-base sm:text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Deskripsi
                    </label>
                    <input
                      type="text"
                      value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      placeholder="Deskripsi singkat"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-base sm:text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="new-repo-private"
                      type="checkbox"
                      checked={newRepoPrivate}
                      onChange={(e) => setNewRepoPrivate(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                    />
                    <label
                      htmlFor="new-repo-private"
                      className="text-xs text-slate-300 cursor-pointer"
                    >
                      Private repository
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingRepo}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {creatingRepo ? (
                      <Spinner size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} weight="bold" />
                    )}
                    <span>Buat Repository di GitHub</span>
                  </button>
                </form>
              ) : (
                /* Select Existing Repo */
                <div>
                  {loadingRepos ? (
                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2 bg-slate-950 rounded-xl border border-slate-800">
                      <Spinner size={14} className="animate-spin text-emerald-400" />
                      <span>Mengambil repositori dari GitHub...</span>
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <p>Tidak ada repositori ditemukan di akun Anda.</p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNew(true)}
                        className="text-emerald-400 hover:underline font-semibold"
                      >
                        Buat repository baru sekarang
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedRepo}
                      onChange={(e) => handleRepoChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    >
                      {repos.map((r) => (
                        <option key={r.id} value={r.fullName}>
                          {r.fullName} {r.isPrivate ? "🔒" : "🌐"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Form Push Options */}
              <form onSubmit={handlePushSubmit} className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  {/* Branch */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <GitBranch size={13} className="text-slate-400" />
                      Branch
                    </label>
                    <input
                      type="text"
                      required
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-base sm:text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Folder */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Folder size={13} className="text-slate-400" />
                      Folder Tujuan
                    </label>
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="Root (kosong)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-base sm:text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Commit Message */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pesan Commit
                  </label>
                  <input
                    type="text"
                    required
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-base sm:text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Submit Push Button */}
                <button
                  id="push-submit-btn"
                  type="submit"
                  disabled={pushing || !selectedRepo}
                  className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pushing ? (
                    <>
                      <Spinner size={16} className="animate-spin" />
                      <span>Mengunggah 8 file ke GitHub...</span>
                    </>
                  ) : (
                    <>
                      <GithubLogo size={16} weight="fill" />
                      <span>Push 8 File ke {selectedRepo || "GitHub"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
