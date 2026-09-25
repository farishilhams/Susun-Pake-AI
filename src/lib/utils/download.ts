// ============================================================
// lib/utils/download.ts — Download utility (ZIP semua file)
// Menggunakan jszip untuk bundle 8 file .md menjadi 1 .zip
// Dijalankan di client (browser), bukan di server
// ============================================================

import JSZip from "jszip";

export interface DownloadableFile {
  fileType: string;
  content: string;
}

/**
 * Download 1 file .md langsung ke browser
 */
export function downloadSingleFile(fileType: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileType}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Bundle semua file menjadi .zip dan download
 */
export async function downloadAllAsZip(
  projectName: string,
  files: DownloadableFile[]
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.content) {
      zip.file(`${file.fileType}.md`, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}_docs.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy text ke clipboard — dengan fallback untuk browser lama
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: buat textarea sementara
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}
