// ============================================================
// modules/files/templates/claude.template.ts
// Template prompt untuk generate CLAUDE.md / AGENTS.md
// Context anchor untuk AI coding assistant
// Struktur mengacu pada CLAUDE.md project ini sendiri
// ============================================================

export const CLAUDE_TEMPLATE = `
Kamu adalah senior developer ahli yang membantu mendokumentasikan context anchor project untuk AI coding assistant.

Buat file CLAUDE.md (juga dikenal sebagai AGENTS.md) untuk project berikut:

{{projectBrief}}

{{clarifications}}

File ini adalah "kontrak" antara developer dan AI coding assistant — berisi aturan, context, dan constraints yang harus selalu dibaca AI di awal setiap sesi coding.

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas dan teknis):

# CLAUDE.md / AGENTS.md — Context Anchor Utama

> Master rules untuk project [nama project].
> Selalu jadikan file ini context pertama di setiap sesi vibe coding.

## 1. Identitas Project
\`\`\`
Nama project     : [nama]
Deskripsi singkat: [1-2 kalimat deskripsi jelas]
Tipe             : [tipe aplikasi]
Target user      : [siapa yang menggunakan]
\`\`\`

## 2. Dokumen Wajib Dibaca Sebelum Kerja
| File | Kapan dibaca AI |
|---|---|
| PRD.md | Sebelum membuat fitur baru |
| ARCHITECTURE.md | Sebelum menyentuh struktur folder, layer, atau data flow |
| TODO.md | Untuk tahu task aktif dan prioritas saat ini |
| WORKFLOW.md | Sebelum commit, buat branch, atau setup CI/CD |
| DESIGN.md | Sebelum membuat/mengubah UI |
| SKILL.md | Untuk pola kode baku yang harus dipakai ulang |
| SECURITY.md | Sebelum implementasi yang menyentuh auth, API key, atau data user |

## 3. Tech Stack (Tetap, Jangan Diganti Tanpa Diskusi)
\`\`\`
[daftar tech stack lengkap project ini]
\`\`\`

## 4. Prinsip Non-Negosiabel
1. [prinsip 1 yang paling kritis untuk project ini]
2. [prinsip 2]
3. Konsistensi > kreativitas — ikuti pola yang sudah ada di codebase.
4. Tidak ada hardcoded secret/API key — semua lewat environment variable server-side.
5. Setiap fitur baru sertakan minimal 1 test untuk logic pentingnya.

## 5. Struktur Folder Baku
\`\`\`
[gambarkan struktur folder utama, konsisten dengan ARCHITECTURE.md]
\`\`\`

## 6. Larangan Eksplisit untuk AI
- [larangan 1 yang paling kritis]
- [larangan 2]
- Jangan hardcode API key di kode frontend/client-side.
- Jangan generate ulang seluruh file kalau cuma perlu edit sebagian.

## 7. Format Prompt yang Disarankan ke AI
\`\`\`
Baca CLAUDE.md, [file pendukung relevan], dan TODO.md dulu.
Task: [deskripsi spesifik]
Constraint: ikuti struktur & konvensi yang sudah ada, jangan ubah pola
lain di luar scope ini.
Setelah selesai: update TODO.md status task ini.
\`\`\`

---
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
