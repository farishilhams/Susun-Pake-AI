// ============================================================
// modules/files/templates/skill.template.ts
// Template prompt untuk generate SKILL.md
// Pola kode baku & snippet yang bisa dipakai ulang
// Struktur mengacu pada SKILL.md project ini sendiri
// ============================================================

export const SKILL_TEMPLATE = `
Kamu adalah senior developer ahli yang membantu mendokumentasikan pola kode baku untuk project.

Buat file SKILL.md (Reusable Patterns & Code Snippets) untuk project berikut:

{{projectBrief}}

{{clarifications}}

File ini berisi pola kode yang sudah terbukti untuk project ini — setiap kali AI coding assistant diminta mengerjakan task yang berkaitan, ia harus menggunakan pola dari file ini, BUKAN membuat implementasi baru dari nol.

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas):

# SKILL.md — Pola Kode & Snippet Baku (Reusable Patterns)

## Skill: [Nama Pola 1 — yang paling krusial untuk project ini]
\`\`\`
Kapan dipakai : [jelaskan kapan pola ini harus digunakan]
Aturan        : [aturan penggunaan pola ini]
\`\`\`
\`\`\`[bahasa pemrograman]
// [kode snippet singkat tapi lengkap]
\`\`\`

## Skill: [Nama Pola 2]
\`\`\`
Kapan dipakai : [jelaskan]
\`\`\`
\`\`\`[bahasa pemrograman]
// [kode snippet]
\`\`\`

## Skill: [Nama Pola 3 — Error Handling]
\`\`\`
Kapan dipakai : [jelaskan]
\`\`\`
\`\`\`[bahasa pemrograman]
// [kode snippet]
\`\`\`

## Skill: [Nama Pola 4 — Response API Standar]
\`\`\`
Kapan dipakai : setiap API route sebelum return response
\`\`\`
\`\`\`[bahasa pemrograman]
// [kode snippet]
\`\`\`

[Tambahkan 2-4 pola lagi yang paling relevan untuk project ini]

## Cara Menambah Skill Baru
1. Kasih nama pola yang jelas.
2. Sertakan kapan pola ini dipakai.
3. Sertakan contoh kode singkat, bukan tutorial panjang.
4. Reference-kan di CLAUDE.md § 2 kalau pola ini krusial.

---
Buat pola yang spesifik untuk tech stack dan kebutuhan project ini.
Setiap pola harus berupa kode yang bisa langsung dipakai, bukan pseudocode.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
