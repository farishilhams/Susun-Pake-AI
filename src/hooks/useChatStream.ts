"use client";

// ============================================================
// hooks/useChatStream.ts — SSE Chat dengan Exponential Backoff & Retry
//
// Token streaming + reconnect otomatis + fungsi retry eksplisit
// Sesuai ARCHITECTURE.md § 7.2 & 7.4
// ============================================================

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const MAX_RETRIES = 2; // chat lebih singkat, cukup 2 retry
const INITIAL_DELAY_MS = 800;

function calcBackoff(attempt: number): number {
  const delay = Math.min(INITIAL_DELAY_MS * Math.pow(2, attempt), 5000);
  const jitter = delay * 0.15 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

export function useChatStream(
  projectId: string,
  initialAiMode: "flash" | "deep" = "flash"
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInterviewDone, setIsInterviewDone] = useState(false);
  const [aiMode, setAiMode] = useState<"flash" | "deep">(initialAiMode);

  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const lastAttemptRef = useRef<{ userMessage: string; isFirst: boolean }>({
    userMessage: "",
    isFirst: false,
  });

  const addMessage = (msg: Omit<ChatMessage, "id">): string => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  };

  const updateLastAssistantMsg = (content: string, streaming = true) => {
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findLastIndex((m) => m.role === "assistant");
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], content, isStreaming: streaming };
      }
      return updated;
    });
  };

  const sendMessage = useCallback(
    async (
      userMessage: string,
      isFirst = false,
      attempt = 0,
      overrideMode?: "flash" | "deep"
    ) => {
      // Cegah eksekusi paralel ganda (misal React StrictMode mount)
      if (inFlightRef.current && attempt === 0) return;
      inFlightRef.current = true;

      lastAttemptRef.current = { userMessage, isFirst };
      setIsSending(true);
      setError(null);

      if (!isFirst && userMessage.trim()) {
        addMessage({ role: "user", content: userMessage });
      }

      // Hindari duplikasi placeholder asisten jika sudah ada bubble kosong
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content.trim()) {
          return prev;
        }
        const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return [...prev, { role: "assistant", content: "", isStreaming: true, id }];
      });

      let fullContent = "";
      abortRef.current = new AbortController();

      const effectiveMode = overrideMode || aiMode;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            message: isFirst ? "Mulai interview" : userMessage,
            model: effectiveMode,
            aiMode: effectiveMode,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          if (res.status === 401 || res.status === 403 || res.status === 429) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error ?? `HTTP ${res.status}`);
          }
          throw new Error(`HTTP ${res.status}`);
        }

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

              if (event.error) {
                // Event error terstruktur dari API
                setError(event.error);
                updateLastAssistantMsg(event.error, false);
                return;
              }

              if (event.chunk !== undefined) {
                fullContent += event.chunk;
                updateLastAssistantMsg(fullContent, true);
              } else if (event.message !== undefined && event.chunk === undefined) {
                fullContent = event.message;
                updateLastAssistantMsg(fullContent, false);
              } else if (event.projectId) {
                // interview:complete
                updateLastAssistantMsg(fullContent, false);
                setIsInterviewDone(true);
              }
            } catch {
              /* lewati chunk malformed */
            }
          }
        }

        updateLastAssistantMsg(fullContent, false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        console.warn(`Chat stream error (attempt ${attempt}):`, err);

        if (attempt < MAX_RETRIES) {
          const delay = calcBackoff(attempt);
          setTimeout(() => {
            sendMessage(userMessage, isFirst, attempt + 1, effectiveMode);
          }, delay);
          return;
        }

        const msg = err instanceof Error ? err.message : "Koneksi terputus";
        setError(msg);
        updateLastAssistantMsg(
          "Maaf, ada kendala koneksi dengan AI Provider. Klik tombol 'Coba Lagi' di bawah.",
          false
        );
      } finally {
        inFlightRef.current = false;
        setIsSending(false);
        // Bersihkan bubble asisten yang tidak pernah menerima konten
        setMessages((prev) =>
          prev.filter((m) => m.role === "user" || m.content.trim() !== "")
        );
      }
    },
    [aiMode, projectId]
  );

  const retry = useCallback(() => {
    const { userMessage, isFirst } = lastAttemptRef.current;
    // Hapus pesan asisten terakhir yang error sebelum retry
    setMessages((prev) => {
      const lastIdx = prev.findLastIndex((m) => m.role === "assistant");
      if (lastIdx !== -1) {
        return prev.filter((_, idx) => idx !== lastIdx);
      }
      return prev;
    });
    sendMessage(userMessage, isFirst);
  }, [sendMessage]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    inFlightRef.current = false;
    setIsSending(false);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setIsInterviewDone(false);
    setError(null);
  }, []);

  return {
    messages,
    isSending,
    error,
    isInterviewDone,
    selectedModel: aiMode,
    setSelectedModel: setAiMode,
    aiMode,
    setAiMode,
    sendMessage,
    retry,
    cancel,
    reset,
  };
}
