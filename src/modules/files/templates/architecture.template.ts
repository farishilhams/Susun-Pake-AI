// ============================================================
// modules/files/templates/architecture.template.ts
// Template prompt untuk generate ARCHITECTURE.md
// Struktur mengacu pada ARCHITECTURE.md project ini sendiri
// ============================================================

export const ARCHITECTURE_TEMPLATE = `
Kamu adalah software architect ahli yang membantu developer mendokumentasikan arsitektur project mereka.

Buat file ARCHITECTURE.md untuk project berikut:

{{projectBrief}}

{{clarifications}}

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas dan teknis):

# ARCHITECTURE.md — {{projectName}}

> [deskripsi singkat project dalam satu kalimat]

## 1. Diagram Alur Sistem (Tingkat Tinggi)
\`\`\`
[Buat diagram ASCII yang menunjukkan komponen utama dan alur data antar komponen]
[Contoh: User Browser → Frontend → API → Database]
\`\`\`

## 2. Tech Stack
\`\`\`
Frontend    : [teknologi frontend]
Backend     : [teknologi backend]
Database    : [database yang dipakai]
Auth        : [sistem autentikasi]
Deployment  : [platform deployment]
[tambahkan baris sesuai kebutuhan]
\`\`\`

## 3. Data Flow per Layer
| Layer | Tanggung Jawab |
|---|---|
| [layer 1] | [tanggung jawab] |
| [layer 2] | [tanggung jawab] |
| [layer N] | [tanggung jawab] |

## 4. Skema Database & Diagram Relasi (ERD)

### 4.1 Diagram Skema Visual (Mermaid ERD)
[WAJIB: Buat diagram ERD lengkap dalam blok code \`\`\`mermaid erDiagram ... \`\`\` yang menggambarkan seluruh entitas/tabel/koleksi dan relasi antar tabelnya secara valid. Format:]
\`\`\`mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    PROJECTS ||--|{ FILES : contains
    PROJECTS ||--o{ CHAT_HISTORY : has
\`\`\`

### 4.2 Detail Koleksi / Tabel
\`\`\`
[nama_koleksi/tabel] : [field-field penting dengan tipe data dan constraints]
[ulangi per koleksi/tabel]
\`\`\`

## 5. Struktur Folder
\`\`\`
[gambarkan struktur folder utama project]
src/
  [folder utama]/
    [subfolder]/
\`\`\`

## 6. Keputusan Arsitektur Penting
| Keputusan | Alasan | Alternatif yang Ditolak |
|---|---|---|
| [keputusan 1] | [alasan] | [alternatif] |

## 7. Catatan Keamanan Arsitektural
- [catatan keamanan yang relevan untuk arsitektur ini]

## 8. ADR Log (Architecture Decision Records)
| Tanggal | Keputusan | Alasan |
|---|---|---|
| [tanggal hari ini] | [keputusan arsitektur awal] | [alasan] |

---
Pastikan semua komponen teknis spesifik untuk project yang diberikan.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
