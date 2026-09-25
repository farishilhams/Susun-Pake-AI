"use client";

// ============================================================
// components/editor/DiffViewer.tsx — Visualizer Komparasi Diff
// Format Unified Diff dengan highlight baris tambah/kurang
// Sesuai DESIGN.md: Monospace JetBrains Mono & Swiss style
// ============================================================

import { useMemo } from "react";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldNum?: number;
  newNum?: number;
}

/**
 * Komparator diff berbasis baris sederhana & cepat
 */
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const diff: DiffLine[] = [];

  // Algoritma LCS ringkas untuk perbandingan teks baris
  let i = 0;
  let j = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      diff.push({
        type: "unchanged",
        text: oldLines[i],
        oldNum: oldLineNum++,
        newNum: newLineNum++,
      });
      i++;
      j++;
    } else {
      // Cek apakah baris baru ada di baris-baris setelahnya pada oldLines (deletion)
      // atau sebaliknya (addition)
      const nextMatchInNew = newLines.indexOf(oldLines[i], j);
      const nextMatchInOld = oldLines.indexOf(newLines[j], i);

      if (nextMatchInNew !== -1 && (nextMatchInOld === -1 || nextMatchInNew - j <= nextMatchInOld - i)) {
        // Baris-baris sampai nextMatchInNew adalah penambahan
        while (j < nextMatchInNew) {
          diff.push({
            type: "added",
            text: newLines[j],
            newNum: newLineNum++,
          });
          j++;
        }
      } else if (nextMatchInOld !== -1) {
        // Baris-baris sampai nextMatchInOld adalah penghapusan
        while (i < nextMatchInOld) {
          diff.push({
            type: "removed",
            text: oldLines[i],
            oldNum: oldLineNum++,
          });
          i++;
        }
      } else {
        // Baris berbeda langsung
        diff.push({
          type: "removed",
          text: oldLines[i],
          oldNum: oldLineNum++,
        });
        diff.push({
          type: "added",
          text: newLines[j],
          newNum: newLineNum++,
        });
        i++;
        j++;
      }
    }
  }

  // Sisa baris yang dihapus
  while (i < oldLines.length) {
    diff.push({
      type: "removed",
      text: oldLines[i],
      oldNum: oldLineNum++,
    });
    i++;
  }

  // Sisa baris yang ditambahkan
  while (j < newLines.length) {
    diff.push({
      type: "added",
      text: newLines[j],
      newNum: newLineNum++,
    });
    j++;
  }

  return diff;
}

export default function DiffViewer({
  oldText,
  newText,
  oldLabel = "Versi Dipilih",
  newLabel = "Versi Saat Ini",
}: DiffViewerProps) {
  const diffLines = useMemo(
    () => computeLineDiff(oldText, newText),
    [oldText, newText]
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === "added") added++;
      if (line.type === "removed") removed++;
    }
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-950 overflow-hidden flex flex-col text-xs font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-3">
          <span className="text-red-400">--- {oldLabel}</span>
          <span className="text-emerald-400">+++ {newLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            +{stats.added} baris
          </span>
          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            -{stats.removed} baris
          </span>
        </div>
      </div>

      {/* Diff content view */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-slate-900/40">
        {diffLines.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            Tidak ada perbedaan teks di antara kedua versi ini.
          </div>
        ) : (
          diffLines.map((line, idx) => {
            const isAdded = line.type === "added";
            const isRemoved = line.type === "removed";

            return (
              <div
                key={idx}
                className={`flex items-start leading-5 select-text transition-colors ${
                  isAdded
                    ? "bg-emerald-950/30 text-emerald-200"
                    : isRemoved
                    ? "bg-red-950/30 text-red-300"
                    : "text-slate-300 hover:bg-slate-900/50"
                }`}
              >
                {/* Line numbers */}
                <div className="w-10 py-0.5 px-1.5 text-right text-[10px] text-slate-600 select-none border-r border-slate-800/60 flex-shrink-0">
                  {line.oldNum ?? ""}
                </div>
                <div className="w-10 py-0.5 px-1.5 text-right text-[10px] text-slate-600 select-none border-r border-slate-800/60 flex-shrink-0">
                  {line.newNum ?? ""}
                </div>

                {/* Diff marker */}
                <div
                  className={`w-6 py-0.5 text-center font-bold select-none flex-shrink-0 ${
                    isAdded
                      ? "text-emerald-400"
                      : isRemoved
                      ? "text-red-400"
                      : "text-slate-600"
                  }`}
                >
                  {isAdded ? "+" : isRemoved ? "-" : " "}
                </div>

                {/* Line text */}
                <div className="py-0.5 px-2 flex-1 whitespace-pre-wrap break-all">
                  {line.text || " "}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
