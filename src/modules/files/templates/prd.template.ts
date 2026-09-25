// ============================================================
// modules/files/templates/prd.template.ts
// Template prompt untuk generate PRD.md
// Struktur mengacu pada PRD.md project ini sendiri sebagai referensi
// Sesuai SKILL.md § "Template Prompt per Jenis File"
// ============================================================

export const PRD_TEMPLATE = `
Kamu adalah technical writer ahli yang membantu developer mendokumentasikan project mereka.

Buat file PRD.md (Product Requirements Document) untuk project berikut:

{{projectBrief}}

{{clarifications}}

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas dan teknis):

# PRD.md — {{projectName}}

## 1. Ringkasan Produk
\`\`\`
Nama produk   : [nama]
Masalah yang diselesaikan: [jelaskan masalah spesifik yang diselesaikan]
Target user   : [siapa yang akan menggunakan]
Value utama   : [apa manfaat utama bagi user]
\`\`\`

## 2. Tujuan & Metrik Sukses
| Tujuan | Metrik Ukur |
|---|---|
| [tujuan 1] | [cara mengukurnya] |
| [tujuan 2] | [cara mengukurnya] |

## 3. Daftar Fitur (Scope)
| Fitur | Prioritas | Status |
|---|---|---|
| [fitur Must 1] | Must | Belum mulai |
| [fitur Should 1] | Should | Belum mulai |
| [fitur Could 1] | Could | Belum mulai |

## 4. User Flow Utama
\`\`\`
Flow: [nama flow utama]
1. [langkah 1]
2. [langkah 2]
...
\`\`\`

## 5. Aturan Bisnis
- [aturan bisnis 1]
- [aturan bisnis 2]

## 6. Non-Functional Requirements
\`\`\`
Performance   : [target performa]
Skalabilitas  : [strategi skalabilitas]
Keamanan      : [keamanan yang dibutuhkan]
Aksesibilitas : [standar aksesibilitas]
\`\`\`

## 7. Out of Scope (untuk MVP)
- [fitur yang sengaja tidak dikerjakan di MVP]

## 8. Riwayat Perubahan Requirement
| Tanggal | Perubahan | Alasan |
|---|---|---|
| [tanggal hari ini] | Dokumen dibuat | Inisiasi project |

---
Pastikan konten spesifik untuk project yang diberikan, bukan placeholder generik.
Isi semua bagian dengan detail nyata berdasarkan brief project.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
