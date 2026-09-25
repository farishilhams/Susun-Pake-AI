// ============================================================
// modules/generator/orchestrator.ts — Batch Generator Orchestrator
//
// 1. Throttling & Pacing Antrian:
//    Delay pacing 1200ms-1500ms antar file + exponential backoff retry.
// 2. Batch Session Consistency (Sticky Provider Strategy):
//    Health check awal, provider terkunci untuk seluruh 8 file,
//    retry di provider yang sama sebelum fallback, dan kunci provider
//    cadangan jika terjadi delegasi permanen.
// 3. Konteks Bersama (Shared Project Context):
//    Seluruh 8 prompt membaca ringkasan interview yang seragam.
// ============================================================

import {
  generateWithFallback,
  checkProviderHealth,
  isRateLimitError,
  ProviderName,
  AiMode,
} from "@/modules/ai-provider/router";
import { StreamCallback } from "@/modules/ai-provider/gemini";
import { buildPrompt } from "@/modules/files/prompt-builder";
import { FILE_TYPES, FileType, ProjectBrief } from "@/types";

export interface ClarificationPair {
  question: string;
  answer: string;
}

export interface SharedProjectContext {
  brief: ProjectBrief;
  clarifications: ClarificationPair[];
  summaryNote?: string;
}

export interface BatchOrchestratorOptions {
  projectId: string;
  context: SharedProjectContext;
  aiMode?: AiMode;
  pacingDelayMs?: number; // Default 1200ms
  onFileStart?: (fileType: FileType, provider: ProviderName) => void;
  onFileToken?: (fileType: FileType, chunk: string) => void;
  onFileComplete?: (
    fileType: FileType,
    content: string,
    provider: ProviderName
  ) => Promise<void> | void;
  onFileError?: (fileType: FileType, error: string) => void;
  onPacing?: (nextFileType: FileType, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BatchGeneratorOrchestrator {
  private activeProvider: ProviderName = "gemini";
  private isInitialized = false;

  constructor(private readonly options: BatchOrchestratorOptions) {}

  /**
   * Health check awal untuk memilih provider yang paling stabil & responsif.
   */
  public async initialize(): Promise<ProviderName> {
    try {
      console.log("[BatchOrchestrator] Menjalankan health check awal...");
      this.activeProvider = await checkProviderHealth("gemini");
      console.log(
        `[BatchOrchestrator] Provider utama terkunci (Sticky): ${this.activeProvider}`
      );
    } catch (err) {
      console.warn(
        "[BatchOrchestrator] Health check gagal, default ke gemini:",
        err
      );
      this.activeProvider = "gemini";
    }
    this.isInitialized = true;
    return this.activeProvider;
  }

  public getActiveProvider(): ProviderName {
    return this.activeProvider;
  }

  /**
   * Eksekusi batch 8 file secara berurutan dengan pacing dan sticky provider.
   */
  public async executeBatch(): Promise<{
    completedFiles: FileType[];
    failedFiles: { fileType: FileType; error: string }[];
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      context,
      aiMode = "flash",
      pacingDelayMs = 1200,
      onFileStart,
      onFileToken,
      onFileComplete,
      onFileError,
      onPacing,
    } = this.options;

    const completedFiles: FileType[] = [];
    const failedFiles: { fileType: FileType; error: string }[] = [];

    // Pastikan konteks bersama mencakup catatan interview jika ada
    const effectiveClarifications = [...context.clarifications];
    if (context.summaryNote) {
      effectiveClarifications.push({
        question: "Ringkasan Hasil Klarifikasi Interview",
        answer: context.summaryNote,
      });
    }

    for (let i = 0; i < FILE_TYPES.length; i++) {
      const fileType = FILE_TYPES[i] as FileType;

      // ─── 1. Throttling & Pacing Delay Antara File ───
      if (i > 0) {
        console.log(
          `[BatchOrchestrator] Pacing delay ${pacingDelayMs}ms sebelum ${fileType}...`
        );
        onPacing?.(fileType, pacingDelayMs);
        await sleep(pacingDelayMs);
      }

      onFileStart?.(fileType, this.activeProvider);

      let content = "";
      let successProvider = this.activeProvider;

      try {
        const prompt = buildPrompt(fileType, context.brief, effectiveClarifications);

        // Eksekusi generate dengan retry di provider yang sama sebelum fallback
        content = await this.generateWithStickyRetry(prompt, {
          fileType,
          aiMode,
          onToken: (chunk) => onFileToken?.(fileType, chunk),
        });

        // Simpan hasil melalui callback
        await onFileComplete?.(fileType, content, successProvider);
        completedFiles.push(fileType);
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : `Gagal generate ${fileType} — kendala server AI`;
        console.error(`[BatchOrchestrator] Error pada ${fileType}:`, err);
        failedFiles.push({ fileType, error: errorMsg });
        onFileError?.(fileType, errorMsg);
      }
    }

    return { completedFiles, failedFiles };
  }

  /**
   * Eksekusi satu file:
   * 1. Coba aktif provider dulu.
   * 2. Jika 429 sementara, retry dengan backoff di provider yang sama (hingga 2x).
   * 3. Jika tetap gagal, fallback ke provider berikutnya dan KUNCI provider baru tersebut
   *    untuk file-file berikutnya agar konsistensi dokumen tetap terjaga.
   */
  private async generateWithStickyRetry(
    prompt: string,
    opts: {
      fileType: FileType;
      aiMode: AiMode;
      onToken?: StreamCallback;
    }
  ): Promise<string> {
    const maxRetriesOnSameProvider = 2;
    let attempt = 0;

    while (attempt <= maxRetriesOnSameProvider) {
      try {
        let usedProvider: ProviderName = this.activeProvider;

        const result = await generateWithFallback(prompt, {
          onToken: opts.onToken,
          aiMode: opts.aiMode,
          preferredProvider: this.activeProvider,
          onProviderUsed: (p) => {
            usedProvider = p;
          },
        });

        // Jika provider yang berhasil berbeda dari activeProvider (misal terjadi delegasi karena 429 permanen),
        // kunci provider baru tersebut sebagai sticky provider untuk seluruh sisa batch!
        if (usedProvider !== this.activeProvider) {
          console.log(
            `[BatchOrchestrator] Provider berubah dari ${this.activeProvider} ke ${usedProvider}. Mengunci ${usedProvider} untuk sisa batch (Sticky Fallback).`
          );
          this.activeProvider = usedProvider;
        }

        return result;
      } catch (err) {
        if (isRateLimitError(err) && attempt < maxRetriesOnSameProvider) {
          attempt++;
          const backoffDelay = 1500 * Math.pow(2, attempt - 1);
          console.warn(
            `[BatchOrchestrator] Rate limit terdeteksi pada ${this.activeProvider}. Backoff retry #${attempt} dalam ${backoffDelay}ms...`
          );
          await sleep(backoffDelay);
          continue;
        }

        // Jika bukan rate limit atau retry sudah habis, coba fallback menyeluruh melalui router
        console.warn(
          `[BatchOrchestrator] ${this.activeProvider} exhausted untuk ${opts.fileType}. Mencoba fallback ke provider lain...`
        );

        let finalProvider: ProviderName = this.activeProvider;
        const fallbackResult = await generateWithFallback(prompt, {
          onToken: opts.onToken,
          aiMode: opts.aiMode,
          onProviderUsed: (p) => {
            finalProvider = p;
          },
        });

        // Kunci provider baru yang berhasil
        if (finalProvider !== this.activeProvider) {
          console.log(
            `[BatchOrchestrator] Sukses fallback ke ${finalProvider}. Mengunci untuk seluruh sisa file batch.`
          );
          this.activeProvider = finalProvider;
        }

        return fallbackResult;
      }
    }

    throw new Error(`Gagal generate dokumen ${opts.fileType}`);
  }
}
