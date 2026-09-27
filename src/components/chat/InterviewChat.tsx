"use client";

// ============================================================
// components/chat/InterviewChat.tsx — Chat Interview (v2)
//
// Refactor menggunakan hooks terpisah:
// - useChatStream: token streaming + exponential backoff reconnect
// - useGenerateStream: generate SSE + reconnect (ARCHITECTURE.md § 7.4)
//
// Sesuai ARCHITECTURE.md § 7.2 (chat real-time) dan § 7.4 (keamanan
// & reliabilitas koneksi) — auth tervalidasi DI SERVER sebelum stream.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperPlaneTilt,
  Spinner,
  Robot,
} from "@phosphor-icons/react";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";
import { useGenerateStream } from "@/hooks/useGenerateStream";
import { ModelSelector } from "@/components/ui/model-selector";
import GenerateProgress from "./GenerateProgress";

interface InterviewChatProps {
  projectId: string;
  projectName: string;
  initialStatus: string;
}

export default function InterviewChat({
  projectId,
  projectName,
  initialStatus,
}: InterviewChatProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const {
    messages,
    isSending,
    error: chatError,
    isInterviewDone,
    selectedModelId,
    setSelectedModelId,
    extendedReasoning,
    setExtendedReasoning,
    fallbackNotice,
    clearFallbackNotice,
    aiMode,
    sendMessage,
    retry: retryChat,
  } = useChatStream(projectId);

  const {
    phase: genPhase,
    fileStatuses,
    retryCount,
    maxRetries,
    start: startGenerate,
    cancel: cancelGenerate,
  } = useGenerateStream({
    projectId,
    aiMode,
    modelId: selectedModelId,
    extendedReasoning,
    onDone: () => {
      setTimeout(() => router.push(`/project/${projectId}`), 1500);
    },
    onError: (msg) => {
      console.error("Generate error:", msg);
    },
  });

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mulai interview saat komponen pertama kali mount (guarded dengan ref untuk cegah duplicate bubble di React Strict Mode)
  useEffect(() => {
    if (initRef.current) return;
    if (initialStatus !== "done" && initialStatus !== "generating") {
      initRef.current = true;
      sendMessage("", true);
    }
  }, [initialStatus, sendMessage]);

  // Focus input setelah AI selesai streaming
  useEffect(() => {
    if (!isSending) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSending]);

  const handleSend = () => {
    if (!inputValue.trim() || isSending) return;
    const msg = inputValue;
    setInputValue("");
    sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending) {
      e.preventDefault();
      handleSend();
    }
  };

  // Tampilkan progress generate jika sudah mulai
  if (genPhase !== "idle") {
    return (
      <div className="flex-1 flex flex-col">
        {/* Reconnect banner */}
        {genPhase === "connecting" && retryCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl text-sm text-warning flex items-center gap-2"
          >
            <Spinner size={14} className="animate-spin flex-shrink-0" />
            Koneksi terputus — mencoba reconnect... (percobaan {retryCount}/{maxRetries})
          </motion.div>
        )}

        <GenerateProgress
          fileStatuses={fileStatuses}
          isDone={genPhase === "done"}
          projectId={projectId}
          isError={genPhase === "error"}
          onRetry={() => {
            cancelGenerate();
            startGenerate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Model Selector Bar with Cinematic Glass ModelSelector */}
      <div className="flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-2xl bg-surface/70 border border-white/10 backdrop-blur-md relative z-30">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-fg">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">Pilih Model AI:</span>
        </div>

        <ModelSelector
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          extendedReasoning={extendedReasoning}
          onToggleExtendedReasoning={setExtendedReasoning}
          disabled={isSending}
        />
      </div>

      {/* Fallback Notice Banner */}
      {fallbackNotice && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearFallbackNotice}
            className="text-amber-400 hover:text-white text-base font-bold ml-2 cursor-pointer leading-none"
            title="Tutup pemberitahuan"
          >
            &times;
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 mb-6 min-h-[300px] max-h-[calc(100vh-380px)] overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages
            .filter((m) => m.role === "user" || Boolean(m.content) || m.isStreaming)
            .map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0"
                    style={{ background: "var(--primary)", opacity: 0.15 }}
                  >
                    <Robot size={14} style={{ color: "var(--primary)" }} />
                  </div>
                )}
                <div
                  className={`
                    max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "border rounded-bl-sm"
                    }
                  `}
                  style={
                    msg.role === "user"
                      ? { background: "var(--primary)" }
                      : { background: "var(--surface)", borderColor: "var(--border-color)" }
                  }
                >
                  {msg.content ? (
                    <span>{msg.content}</span>
                  ) : (
                    <span className="flex items-center gap-1.5" style={{ color: "var(--muted-fg)" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner with Retry button */}
      {chatError && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-xs sm:text-sm text-destructive leading-relaxed">
            <span className="font-semibold block sm:inline mr-1">Kendala AI Provider:</span>
            <span>{chatError}</span>
          </div>
          <button
            type="button"
            onClick={() => retryChat()}
            disabled={isSending}
            className="px-4 py-2 rounded-lg text-xs font-mono font-semibold bg-destructive text-white hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap shadow-sm"
          >
            Coba Lagi (Retry) ↺
          </button>
        </div>
      )}

      {/* Interview selesai — tombol generate */}
      {isInterviewDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 mb-5 text-center border shadow-xl backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, var(--surface) 90%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mx-auto mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="font-bold text-base mb-1 text-foreground">
            Interview Selesai &amp; Siap Generate!
          </p>
          <p className="text-xs text-muted-fg max-w-md mx-auto mb-4 leading-relaxed">
            AI siap menyusun 8 file fondasi arsitektur untuk{" "}
            <strong className="text-foreground">{projectName}</strong>. Pastikan model AI di bawah sesuai kebutuhanmu:
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mb-5">
            <span className="text-xs text-muted-fg font-mono">Engine Kompilasi:</span>
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              extendedReasoning={extendedReasoning}
              onToggleExtendedReasoning={setExtendedReasoning}
            />
          </div>

          <button
            id="start-generate-btn"
            type="button"
            onClick={() => startGenerate({ modelId: selectedModelId, extendedReasoning })}
            className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center gap-2 shadow-lg hover:opacity-95 active:scale-[0.98] cursor-pointer"
            style={{
              background: "var(--primary)",
              color: "var(--primary-fg)",
            }}
          >
            <span>Generate 8 File Sekarang</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </motion.div>
      )}

      {/* Chat input */}
      {!isInterviewDone && (
        <div
          className="flex items-center gap-3 rounded-xl p-2 border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-color)",
          }}
        >
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik jawaban kamu..."
            disabled={isSending}
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none text-base sm:text-sm disabled:opacity-50"
            style={{ color: "var(--foreground)" }}
          />
          <button
            id="send-message-btn"
            type="button"
            onClick={handleSend}
            disabled={isSending || !inputValue.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            style={{
              background: "var(--primary)",
              color: "var(--primary-fg)",
            }}
          >
            {isSending ? (
              <Spinner size={14} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={14} />
            )}
            {!isSending && <span>Kirim</span>}
          </button>
        </div>
      )}
    </div>
  );
}
