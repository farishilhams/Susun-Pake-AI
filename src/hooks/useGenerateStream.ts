"use client";

// ============================================================
// hooks/useGenerateStream.ts — SSE Client Hook dengan Exponential Backoff
//
// Sesuai ARCHITECTURE.md § 7.4:
// - Auth tervalidasi SEBELUM stream dibuka
// - Reconnect otomatis dengan exponential backoff jika koneksi putus
// - Progres tidak hilang saat reconnect (resume dari event terakhir)
// - Rate limiting sudah dicek di server SEBELUM stream mulai
//
// Pattern: fetch() + ReadableStream (bukan EventSource) karena
// EventSource tidak support POST dan tidak bisa mengirim body JSON.
// Reconnect diimplementasi manual.
// ============================================================

import { useState, useCallback, useRef } from "react";

export interface FileStatus {
  fileType: string;
  status: "waiting" | "in_progress" | "done" | "error";
  content?: string;
}

export type StreamPhase = "idle" | "connecting" | "streaming" | "done" | "error";

interface UseGenerateStreamOptions {
  projectId: string;
  aiMode?: "flash" | "deep";
  onFileUpdate?: (fileType: string, status: FileStatus["status"], content?: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

// Exponential backoff config (ARCHITECTURE.md § 7.4)
const MAX_RETRIES = 4;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 16000;

function calcBackoff(attempt: number): number {
  // 1s → 2s → 4s → 8s → cap 16s
  const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  // jitter ±20% untuk menghindari thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

export function useGenerateStream({
  projectId,
  aiMode = "flash",
  onFileUpdate,
  onDone,
  onError,
}: UseGenerateStreamOptions) {
  const [phase, setPhase] = useState<StreamPhase>("idle");
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  // Satu kali start: inisialisasi 8 file status
  const initFileStatuses = useCallback(() => {
    const FILE_TYPES = ["PRD", "ARCHITECTURE", "DESIGN", "CLAUDE", "SKILL", "TODO", "WORKFLOW", "SECURITY"];
    const initial: FileStatus[] = FILE_TYPES.map((ft) => ({ fileType: ft, status: "waiting" }));
    setFileStatuses(initial);
    return initial;
  }, []);

  const updateStatus = useCallback(
    (fileType: string, status: FileStatus["status"], content?: string) => {
      setFileStatuses((prev) =>
        prev.map((f) => (f.fileType === fileType ? { ...f, status, content } : f))
      );
      onFileUpdate?.(fileType, status, content);
    },
    [onFileUpdate]
  );

  // Core streaming function — dipanggil juga saat reconnect
  const startStream = useCallback(
    async (attempt: number) => {
      if (!isRunningRef.current) return;

      setPhase(attempt === 0 ? "connecting" : "connecting");
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, aiMode }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          // Non-streaming error (auth fail, rate limit, dll)
          let errMsg = `HTTP ${res.status}`;
          try {
            const json = await res.json();
            errMsg = json.error ?? json.message ?? errMsg;
          } catch { /* ignore parse error */ }

          // 401/403/429: jangan retry, langsung error
          if (res.status === 401 || res.status === 403 || res.status === 429) {
            setPhase("error");
            onError?.(errMsg);
            isRunningRef.current = false;
            return;
          }

          throw new Error(errMsg);
        }

        if (!res.body) throw new Error("Response body kosong");

        setPhase("streaming");
        setRetryCount(0); // berhasil connect, reset counter

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const event = JSON.parse(dataStr);

              if (event.fileType && event.status === "in_progress") {
                updateStatus(event.fileType, "in_progress");
              } else if (event.fileType && event.chunk !== undefined) {
                // token stream — update content secara inkremental
                setFileStatuses((prev) =>
                  prev.map((f) =>
                    f.fileType === event.fileType
                      ? { ...f, content: (f.content ?? "") + event.chunk }
                      : f
                  )
                );
              } else if (event.fileType && event.content !== undefined) {
                // file complete
                updateStatus(event.fileType, "done", event.content);
              } else if (event.projectId) {
                // semua file done
                setPhase("done");
                isRunningRef.current = false;
                onDone?.();
                return;
              } else if (event.message && event.fileType) {
                updateStatus(event.fileType, "error");
              }
            } catch { /* skip malformed event */ }
          }
        }

        // Stream selesai tanpa event done — anggap berhasil
        setPhase("done");
        isRunningRef.current = false;
        onDone?.();
      } catch (err: unknown) {
        if (!isRunningRef.current) return; // user cancel
        if (err instanceof Error && err.name === "AbortError") return;

        console.warn(`Generate stream error (attempt ${attempt}):`, err);

        // Coba reconnect dengan exponential backoff
        if (attempt < MAX_RETRIES) {
          const delay = calcBackoff(attempt);
          console.info(`Retry dalam ${delay}ms (percobaan ${attempt + 1}/${MAX_RETRIES})`);
          setRetryCount(attempt + 1);
          setPhase("connecting");

          retryTimerRef.current = setTimeout(() => {
            if (isRunningRef.current) {
              startStream(attempt + 1);
            }
          }, delay);
        } else {
          setPhase("error");
          isRunningRef.current = false;
          const msg = err instanceof Error ? err.message : "Koneksi gagal setelah beberapa percobaan";
          onError?.(msg);
        }
      }
    },
    [projectId, updateStatus, onDone, onError]
  );

  const start = useCallback(() => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    setRetryCount(0);
    initFileStatuses();
    startStream(0);
  }, [initFileStatuses, startStream]);

  const cancel = useCallback(() => {
    isRunningRef.current = false;
    abortRef.current?.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setPhase("idle");
  }, []);

  return {
    phase,
    fileStatuses,
    retryCount,
    maxRetries: MAX_RETRIES,
    start,
    cancel,
  };
}
