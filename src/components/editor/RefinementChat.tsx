"use client";

// ============================================================
// components/editor/RefinementChat.tsx — Refinement Conversational
//
// Panel chat di sisi editor untuk refine file spesifik secara live
// AI stream jawaban SEKALIGUS update konten file di editor
// Sesuai ARCHITECTURE.md § 7.2
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperPlaneTilt,
  Spinner,
  Robot,
  X,
  ChatText,
} from "@phosphor-icons/react";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface RefinementChatProps {
  projectId: string;
  activeFileType: string;
  onFileUpdated: (fileType: string, content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function RefinementChat({
  projectId,
  activeFileType,
  onFileUpdated,
  isOpen,
  onClose,
}: RefinementChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  const addMsg = (msg: Omit<ChatMsg, "id">): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  };

  const updateLastAssistant = (content: string, streaming = true) => {
    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findLastIndex((m) => m.role === "assistant");
      if (idx !== -1) updated[idx] = { ...updated[idx], content, isStreaming: streaming };
      return updated;
    });
  };

  const sendRefine = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setError(null);
    setIsSending(true);
    addMsg({ role: "user", content: text });
    addMsg({ role: "assistant", content: "", isStreaming: true });

    let fullChat = "";
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: text,
          targetFileType: activeFileType,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
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
            const evt = JSON.parse(dataStr);

            if (evt.chunk !== undefined) {
              fullChat += evt.chunk;
              updateLastAssistant(fullChat, true);
            } else if (evt.message !== undefined) {
              fullChat = evt.message;
              updateLastAssistant(fullChat, false);
            } else if (evt.fileType && evt.content !== undefined) {
              // file:updated — update editor live tanpa refresh
              onFileUpdated(evt.fileType, evt.content);
            } else if (evt.message && !evt.fileType) {
              // error
              setError(evt.message);
              updateLastAssistant("Maaf, terjadi error. Coba lagi.", false);
            }
          } catch { /* skip */ }
        }
      }

      updateLastAssistant(fullChat, false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Koneksi error";
      setError(msg);
      updateLastAssistant("Maaf, koneksi terputus. Coba lagi.", false);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isSending, projectId, activeFileType, onFileUpdated]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendRefine();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col border-l"
        style={{
          width: 320,
          flexShrink: 0,
          background: "var(--surface)",
          borderColor: "var(--border-color)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <ChatText size={15} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
              Refine{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
                {activeFileType}.md
              </span>
            </span>
          </div>
          <button
            id="close-refine-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--muted-fg)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Hint awal */}
        {messages.length === 0 && (
          <div className="px-4 py-6 text-center">
            <Robot size={28} className="mx-auto mb-2" style={{ color: "var(--primary)", opacity: 0.5 }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-fg)" }}>
              Chat untuk merevisi{" "}
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{activeFileType}.md</strong>.
              Contoh: <em>&ldquo;Tambahkan bagian rate limiting di ARCHITECTURE&rdquo;</em>
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "var(--primary)", color: "var(--primary-fg)", borderRadius: "10px 10px 2px 10px" }
                    : { background: "var(--muted)", color: "var(--foreground)", borderRadius: "2px 10px 10px 10px" }
                }
              >
                {msg.content || (
                  <span className="flex gap-1" style={{ color: "var(--muted-fg)" }}>
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
                {msg.isStreaming && msg.content && (
                  <span
                    className="inline-block w-0.5 h-3 ml-0.5 animate-pulse align-middle"
                    style={{ background: "var(--primary)" }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs px-3 pb-1 text-center" style={{ color: "var(--destructive)" }}>
            {error}
          </p>
        )}

        {/* Input */}
        <div
          className="p-3 border-t flex-shrink-0"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div
            className="flex items-end gap-2 rounded-lg border p-2"
            style={{ background: "var(--background)", borderColor: "var(--border-color)" }}
          >
            <textarea
              ref={inputRef}
              id="refine-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Revisi ${activeFileType}.md... (Enter kirim, Shift+Enter baris baru)`}
              disabled={isSending}
              className="flex-1 bg-transparent resize-none focus:outline-none text-base sm:text-xs leading-relaxed disabled:opacity-50"
              style={{ color: "var(--foreground)", maxHeight: 80 }}
            />
            <button
              id="send-refine-btn"
              type="button"
              onClick={sendRefine}
              disabled={isSending || !input.trim()}
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {isSending ? (
                <Spinner size={12} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={12} />
              )}
            </button>
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: "var(--muted-fg)", opacity: 0.7 }}>
            File akan terupdate live di editor
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
