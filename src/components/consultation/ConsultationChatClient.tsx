"use client";

// ============================================================
// components/consultation/ConsultationChatClient.tsx
// Antarmuka Chatbot Konsultasi AI — Spesialis Arsitektur & Produk
// Menggunakan SSE streaming, rate limiting terpisah, dan UI tokens
// baku Susun Pake AI (DESIGN.md § 4, 6 & SKILL.md)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Trash2,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  GlassPill,
  AuroraBackground,
  GridBackground,
  ConfirmModal,
  ModelSelector,
} from "@/components/ui";
import { Navbar, Footer } from "@/components/layout";
import {
  getDynamicStarterPrompts,
  PROMPT_CATEGORIES,
  StarterPromptItem,
} from "@/modules/consultation/starter-prompts";

interface Message {
  _id?: string;
  role: "user" | "assistant";
  message: string;
  createdAt?: string;
}

export default function ConsultationChatClient() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>("gemini-2.5-flash");
  const [extendedReasoning, setExtendedReasoning] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [aiMode] = useState<"flash" | "deep">("flash");
  const [starterPrompts, setStarterPrompts] = useState<StarterPromptItem[]>(() =>
    getDynamicStarterPrompts(4, "all")
  );
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>("all");
  const [isPromptRotating, setIsPromptRotating] = useState(false);
  const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number }>({
    used: 0,
    remaining: 20,
    limit: 20,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll HANYA di dalam container percakapan internal, TIDAK menggulir window global ke bawah
  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Pastikan saat pertama kali halaman terbuka, window selalu berada di puncak teratas (top: 0)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Auto-scroll chat hanya saat pesan bertambah dan bukan pada initial mount kosong
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (messages.length > 0) {
        scrollToBottom(false);
      }
      return;
    }
    scrollToBottom(true);
  }, [messages]);

  // Ambil riwayat chat dan sisa kuota jika user sudah login
  const fetchHistoryAndQuota = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/consultation");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMessages(json.data.messages || []);
          if (json.data.quota) {
            setQuota(json.data.quota);
          }
          if (json.data.suggestions && json.data.suggestions.length > 0) {
            setStarterPrompts(json.data.suggestions);
          }
        }
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat konsultasi:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistoryAndQuota();
  }, [fetchHistoryAndQuota]);

  // Handler pengacakan starter prompt real-time dengan animasi rotasi
  const handleShufflePrompts = (cat?: string) => {
    const targetCat = cat !== undefined ? cat : selectedPromptCategory;
    if (cat !== undefined) {
      setSelectedPromptCategory(cat);
    }
    setIsPromptRotating(true);
    setTimeout(() => {
      setStarterPrompts(getDynamicStarterPrompts(4, targetCat));
      setIsPromptRotating(false);
    }, 150);
  };

  // Salin pesan bot ke clipboard
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Buka modal konfirmasi bersihkan chat
  const handleOpenClearModal = () => {
    setIsClearModalOpen(true);
  };

  // Eksekusi pembersihan riwayat chat setelah dikonfirmasi via modal
  const handleConfirmClearChat = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/consultation", { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        setErrorMessage(null);
        setIsClearModalOpen(false);
      }
    } catch (err) {
      console.error("Gagal menghapus riwayat chat:", err);
    } finally {
      setIsClearing(false);
    }
  };

  // Kirim pesan dengan SSE streaming
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    if (!isAuthenticated) {
      setErrorMessage("Silakan masuk atau daftar terlebih dahulu untuk menggunakan konsultasi AI.");
      return;
    }

    if (quota.remaining <= 0) {
      setErrorMessage("Batas kuota konsultasi harian Anda telah habis (maks 20/hari). Coba lagi besok.");
      return;
    }

    setErrorMessage(null);
    setInputMessage("");

    // Tambah pesan user ke UI seketika
    const newMessages: Message[] = [...messages, { role: "user", message: text }];
    // Tambah placeholder assistant yang akan diisi token streaming
    const assistantIndex = newMessages.length;
    newMessages.push({ role: "assistant", message: "" });
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          modelId: selectedModelId,
          extendedReasoning,
          aiMode,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Gagal menghubungi layanan konsultasi.");
      }

      if (!res.body) throw new Error("ReadableStream tidak didukung browser.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.replace(/^data:\s*/, "").trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle fallback notification
            if (parsed.originalProvider && parsed.fallbackProvider) {
              setFallbackNotice(
                parsed.message || `Model dialihkan sementara ke ${parsed.fallbackModel || parsed.fallbackProvider}`
              );
            }

            const tokenChunk = parsed.chunk ?? parsed.data?.chunk;
            const fullMsg = parsed.message ?? parsed.data?.message;
            const errText = parsed.error ?? parsed.data?.error;

            if (errText) {
              throw new Error(errText);
            }

            if (tokenChunk !== undefined) {
              accumulatedText += tokenChunk;
              setMessages((prev) => {
                const copy = [...prev];
                if (copy[assistantIndex]) {
                  copy[assistantIndex] = {
                    ...copy[assistantIndex],
                    message: accumulatedText,
                  };
                }
                return copy;
              });
            } else if (fullMsg !== undefined) {
              accumulatedText = fullMsg;
              setMessages((prev) => {
                const copy = [...prev];
                if (copy[assistantIndex]) {
                  copy[assistantIndex] = {
                    ...copy[assistantIndex],
                    message: accumulatedText,
                  };
                }
                return copy;
              });
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr;
            }
          }
        }
      }

      // Sinkronkan sisa kuota terkini dari database
      await fetchHistoryAndQuota();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      // Hapus pesan assistant kosong jika gagal total
      setMessages((prev) => {
        if (prev[assistantIndex]?.message === "") {
          return prev.slice(0, assistantIndex);
        }
        return prev;
      });
      // Sinkronkan ulang kuota (termasuk jika ada refund otomatis dari server)
      await fetchHistoryAndQuota();
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <main className="relative flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex flex-col">
        <AuroraBackground />
        <GridBackground />

        {/* Header & Status Section */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GlassPill className="text-primary font-medium text-xs flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>Konsultan AI — Arsitektur & Strategi Produk</span>
              </GlassPill>

              {/* Sisa Kuota Terpisah */}
              {isAuthenticated && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-card/60 border border-border/60 text-muted-foreground">
                  Kuota: <strong className="text-primary">{quota.remaining}</strong>/{quota.limit} hari ini
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Konsultasi <span className="text-primary">Arsitektur & Vibe Coding</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Rich Model Selector Dropdown */}
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              extendedReasoning={extendedReasoning}
              onToggleExtendedReasoning={setExtendedReasoning}
              disabled={isLoading}
              align="end"
            />

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleOpenClearModal}
                title="Bersihkan chat"
                className="p-2 rounded-full bg-card/50 border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fallback Notice Banner */}
        {fallbackNotice && (
          <div className="relative z-10 p-3 rounded-xl mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{fallbackNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFallbackNotice(null)}
              className="text-amber-400 hover:text-white font-bold ml-2 cursor-pointer leading-none text-xs"
              title="Tutup pemberitahuan"
            >
              &times;
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="relative z-10 p-3.5 rounded-2xl mb-4 bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {!isAuthenticated && (
                <div className="mt-2 flex gap-2">
                  <Link href="/login" className="font-bold underline hover:opacity-80">
                    Masuk Sekarang
                  </Link>
                  <span>atau</span>
                  <Link href="/register" className="font-bold underline hover:opacity-80">
                    Daftar Akun Gratis
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area Card */}
        <div className="relative z-10 flex-1 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl min-h-[520px] h-[calc(100vh-16rem)] max-h-[780px]">
          {/* Messages Container */}
          <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.length === 0 ? (
              /* Welcome / Empty Chat State */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-10 max-w-xl mx-auto my-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                  <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                  Ada yang mau didiskusikan soal arsitektur atau ide project?
                </h2>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                  Tanyakan apa saja seputar pemilihan stack, skema relasi database,
                  desain sistem, validasi ide bisnis, maupun cara menyusun dokumen spek
                  yang efektif untuk AI coding assistant.
                </p>

                {/* Header Topik Inspirasi & Tombol Acak Real-Time */}
                <div className="w-full flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Inspirasi Topik Konsultasi:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShufflePrompts()}
                    disabled={isPromptRotating}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/25 text-[11px] font-mono font-medium text-primary transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                    title="Acak rekomendasi pertanyaan baru"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPromptRotating ? "animate-spin" : ""}`} />
                    <span>Ganti Topik ↺</span>
                  </button>
                </div>

                {/* Filter Kategori Topik */}
                <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {PROMPT_CATEGORIES.map((cat) => {
                    const isActive = selectedPromptCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleShufflePrompts(cat.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer select-none ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                            : "bg-background/60 hover:bg-background border border-border/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Starter Prompts Grid (Dynamic & Animated) */}
                <div
                  className={`w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left transition-all duration-200 ${
                    isPromptRotating ? "opacity-30 scale-[0.99]" : "opacity-100 scale-100"
                  }`}
                >
                  {starterPrompts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSendMessage(item.text)}
                      className="p-3.5 rounded-2xl bg-background/50 hover:bg-background/90 border border-border/60 hover:border-primary/50 text-left transition-all duration-200 group flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                            {item.badge}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 font-medium leading-relaxed group-hover:text-primary transition-colors line-clamp-3">
                          {item.text}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        <span className="text-[10px] font-medium">Tanyakan ke AI</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Messages */
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md font-medium"
                        : "bg-background/80 border border-border/60 rounded-tl-sm text-foreground shadow-sm"
                      }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    ) : (
                      <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words">
                        {msg.message ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.message}
                          </ReactMarkdown>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 text-muted-foreground font-mono text-xs">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                            <span className="ml-1 text-[11px]">Konsultan sedang merumuskan jawaban...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Copy Button for Assistant */}
                    {msg.role === "assistant" && msg.message && (
                      <div className="mt-2.5 pt-2 border-t border-border/30 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.message, index)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Jawaban</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-secondary border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Controls Container */}
          <div className="p-3 sm:p-4 bg-background/60 backdrop-blur-md border-t border-border/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isAuthenticated
                    ? "Tanyakan arsitektur, tech stack, atau strategi produk... (Enter untuk kirim)"
                    : "Masuk terlebih dahulu untuk mengirim pertanyaan..."
                }
                disabled={isLoading || !isAuthenticated}
                className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-background border border-border/60 rounded-2xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all placeholder:text-muted-foreground/60 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim() || !isAuthenticated}
                className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                aria-label="Kirim Pesan"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/70 px-2">
              <span className="hidden sm:inline">Shift + Enter untuk baris baru</span>
            </div>
          </div>
        </div>

        {/* Modal Konfirmasi Hapus Riwayat Chat */}
        <ConfirmModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={handleConfirmClearChat}
          title="Bersihkan Riwayat Konsultasi?"
          description={
            <span>
              Seluruh percakapan konsultasi arsitektur dan strategi produk ini akan dihapus
              secara permanen dari akun Anda. Tindakan ini tidak dapat dibatalkan.
            </span>
          }
          confirmText="Ya, Bersihkan Riwayat"
          cancelText="Batal"
          variant="danger"
          isLoading={isClearing}
        />
      </main>

      <Footer />
    </div>
  );
}
