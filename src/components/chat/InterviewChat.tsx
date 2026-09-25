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
import { Zap, Brain, Sparkles, ChevronDown, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";
import { useGenerateStream } from "@/hooks/useGenerateStream";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const {
    messages,
    isSending,
    error: chatError,
    isInterviewDone,
    selectedModel,
    setSelectedModel,
    aiMode,
    setAiMode,
    sendMessage,
    retry: retryChat,
  } = useChatStream(projectId);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

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
      {/* Model Selector Bar with Cinematic Glass Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-4 py-3 rounded-2xl bg-surface/70 border border-white/10 backdrop-blur-md relative z-30">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-fg">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">Engine AI Aktif:</span>
          <span className="text-foreground font-semibold">
            {selectedModel === "flash"
              ? "Gemini 2.5 Flash / Groq LPU"
              : "DeepSeek R1 / Gemini 2.5 Pro"}
          </span>
        </div>

        {/* Dropdown Container */}
        <div ref={dropdownRef} className="relative w-full sm:w-auto">
          <button
            type="button"
            id="model-selector-dropdown-trigger"
            disabled={isSending}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            className="w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-primary/40 text-foreground transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedModel === "flash"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {selectedModel === "flash" ? (
                  <Zap className="w-3 h-3" />
                ) : (
                  <Brain className="w-3 h-3" />
                )}
              </div>
              <span className="font-mono text-xs font-semibold truncate">
                {selectedModel === "flash" ? "Mode Flash / Cepat" : "Mode Mendalam / Reasoning"}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-fg shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-primary" : ""
              }`}
            />
          </button>

          {/* Floating Dropdown Menu Popover */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 sm:right-0 top-full mt-2 w-full sm:w-[360px] rounded-2xl border border-white/15 bg-[#0F172A]/95 backdrop-blur-2xl shadow-2xl p-2.5 z-50 text-xs font-mono"
              >
                <div className="px-3 py-1.5 mb-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-fg">
                    PILIH ENGINE &amp; MODEL AI
                  </span>
                  <span className="text-[10px] text-primary font-semibold">Router Fallback Aktif</span>
                </div>

                {/* Option 1: Flash */}
                <button
                  type="button"
                  id="select-model-flash"
                  onClick={() => {
                    setSelectedModel("flash");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left mb-1.5 border cursor-pointer ${
                    selectedModel === "flash"
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                      : "border-transparent hover:bg-white/5 text-muted-fg hover:text-foreground"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">Mode Flash / Cepat</span>
                      {selectedModel === "flash" && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-primary/90 font-medium mt-0.5">
                      Google Gemini 2.5 Flash / Groq Llama 3.3
                    </p>
                    <p className="text-[10px] text-muted-fg mt-1 leading-relaxed">
                      Dioptimalkan untuk respons klarifikasi instan &amp; latensi sangat rendah.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Status: Online &amp; Respons Cepat</span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Deep */}
                <button
                  type="button"
                  id="select-model-deep"
                  onClick={() => {
                    setSelectedModel("deep");
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left border cursor-pointer ${
                    selectedModel === "deep"
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                      : "border-transparent hover:bg-white/5 text-muted-fg hover:text-foreground"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">Mode Mendalam / Reasoning</span>
                      {selectedModel === "deep" && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-purple-300 font-medium mt-0.5">
                      DeepSeek R1 Free / Gemini 1.5 Pro
                    </p>
                    <p className="text-[10px] text-muted-fg mt-1 leading-relaxed">
                      Dioptimalkan untuk analisis arsitektur mendalam, logika edge-case, dan ERD kompleks.
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Status: Online &amp; Deep Reasoning</span>
                    </div>
                  </div>
                </button>

                {/* Footer hint */}
                <div className="px-3 pt-2 mt-1.5 border-t border-white/5 text-[10px] text-muted-fg flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Router otomatis fallback jika kuota model utama habis.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
          className="rounded-xl p-5 mb-4 text-center border"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        >
          <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>
            Interview selesai!
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--muted-fg)" }}>
            AI siap membuat 8 file dokumentasi untuk{" "}
            <strong style={{ color: "var(--foreground)" }}>{projectName}</strong>.
          </p>
          <button
            id="start-generate-btn"
            type="button"
            onClick={startGenerate}
            className="px-8 py-3 rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 shadow-md hover:opacity-90 active:scale-[0.98]"
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
