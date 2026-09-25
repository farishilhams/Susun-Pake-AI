// ============================================================
// modules/files/prompt-builder.ts — Membangun prompt per jenis file
// Memilih template yang tepat dan inject context project
// Sesuai ARCHITECTURE.md § 5 dan SKILL.md § "Template Prompt per Jenis File"
// ============================================================

import { FileType, ProjectBrief } from "@/types";
import {
  PRD_TEMPLATE,
  ARCHITECTURE_TEMPLATE,
  DESIGN_TEMPLATE,
  CLAUDE_TEMPLATE,
  SKILL_TEMPLATE,
  TODO_TEMPLATE,
  WORKFLOW_TEMPLATE,
  SECURITY_TEMPLATE,
} from "./templates";

const TEMPLATE_MAP: Record<FileType, string> = {
  PRD: PRD_TEMPLATE,
  ARCHITECTURE: ARCHITECTURE_TEMPLATE,
  DESIGN: DESIGN_TEMPLATE,
  CLAUDE: CLAUDE_TEMPLATE,
  SKILL: SKILL_TEMPLATE,
  TODO: TODO_TEMPLATE,
  WORKFLOW: WORKFLOW_TEMPLATE,
  SECURITY: SECURITY_TEMPLATE,
};

/**
 * Format clarification messages dari interview menjadi string konteks
 */
function formatClarifications(
  clarifications: Array<{ question: string; answer: string }>
): string {
  if (!clarifications || clarifications.length === 0) return "";

  const lines = clarifications.map(
    ({ question, answer }) => `Q: ${question}\nA: ${answer}`
  );

  return `\nKonteks tambahan dari interview:\n${lines.join("\n\n")}`;
}

/**
 * Format project brief menjadi string yang komprehensif
 */
function formatBrief(brief: ProjectBrief): string {
  return [
    `Nama Project: ${brief.name}`,
    `Tipe Aplikasi: ${brief.projectType}`,
    `Fitur Utama: ${brief.mainFeatures}`,
    brief.techStackPreference
      ? `Preferensi Tech Stack: ${brief.techStackPreference}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Bangun prompt lengkap untuk satu jenis file .md
 *
 * @param fileType - Salah satu dari 8 jenis file
 * @param brief - Brief project dari form wizard
 * @param clarifications - Jawaban dari interview conversational (opsional)
 */
export function buildPrompt(
  fileType: FileType,
  brief: ProjectBrief,
  clarifications: Array<{ question: string; answer: string }> = []
): string {
  const template = TEMPLATE_MAP[fileType];

  if (!template) {
    throw new Error(`Template tidak ditemukan untuk fileType: ${fileType}`);
  }

  const briefText = formatBrief(brief);
  const clarificationText = formatClarifications(clarifications);

  return template
    .replace(/{{projectBrief}}/g, briefText)
    .replace(/{{clarifications}}/g, clarificationText)
    .replace(/{{projectName}}/g, brief.name);
}

/**
 * Bangun prompt interview untuk AI mengajukan pertanyaan klarifikasi.
 * AI akan mengajukan MAKS 5 pertanyaan berdasarkan brief awal.
 * Sesuai PRD.md § 4 User Flow dan pola ARCHITECTURE.md § 7.2
 */
export function buildInterviewPrompt(
  brief: ProjectBrief,
  previousMessages: Array<{ role: "user" | "assistant"; message: string }>
): string {
  const briefText = formatBrief(brief);
  const conversationHistory =
    previousMessages.length > 0
      ? "\n\nRiwayat percakapan sebelumnya:\n" +
        previousMessages
          .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.message}`)
          .join("\n")
      : "";

  const questionCount = previousMessages.filter(
    (m) => m.role === "assistant"
  ).length;

  if (questionCount >= 5) {
    return `
Berdasarkan informasi berikut tentang project "${brief.name}":

${briefText}
${conversationHistory}

Kamu sudah mengajukan ${questionCount} pertanyaan. Sekarang buat rangkuman singkat dari semua informasi yang terkumpul (brief + jawaban user), lalu nyatakan bahwa kamu siap untuk membuat 8 file dokumentasi. 

Format rangkuman:
"Baik, berdasarkan informasi yang telah dikumpulkan, saya siap membuat 8 file dokumentasi untuk project [nama]. Berikut ringkasan project: [ringkasan 2-3 kalimat]. Mari kita mulai generate!"

Respons hanya dalam bahasa Indonesia.
`.trim();
  }

  return `
Kamu adalah AI assistant yang membantu developer mendokumentasikan project mereka.

Brief awal project dari user:
${briefText}
${conversationHistory}

Kamu bertugas mengajukan pertanyaan klarifikasi untuk memahami project lebih dalam sebelum membuat 8 file dokumentasi (PRD, ARCHITECTURE, DESIGN, CLAUDE, SKILL, TODO, WORKFLOW, SECURITY).

Aturan KETAT:
1. Ajukan MAKSIMAL 1 pertanyaan per respons (bukan list pertanyaan sekaligus)
2. Total pertanyaan TIDAK BOLEH lebih dari 5 pertanyaan keseluruhan
3. Pertanyaan harus spesifik dan langsung ke inti — hindari yang jawabannya sudah tersirat dari brief
4. Fokus pada hal yang paling berdampak pada dokumentasi: target user spesifik, fitur utama, kendala teknis, atau aturan bisnis kritis
5. Gunakan bahasa Indonesia yang natural dan friendly

${questionCount === 0 ? "Mulai dengan pertanyaan pertama yang paling penting." : `Ini adalah pertanyaan ke-${questionCount + 1} dari maksimal 5.`}

Respons hanya berupa pertanyaan (1 pertanyaan saja), tanpa penjelasan panjang.
`.trim();
}
