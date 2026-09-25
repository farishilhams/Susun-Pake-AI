// ============================================================
// modules/files/templates/workflow.template.ts
// Template prompt untuk generate WORKFLOW.md
// Alur kerja development, branching, dan deployment
// Struktur mengacu pada WORKFLOW.md project ini sendiri
// ============================================================

export const WORKFLOW_TEMPLATE = `
Kamu adalah DevOps engineer ahli yang membantu developer mendokumentasikan workflow development project mereka.

Buat file WORKFLOW.md untuk project berikut:

{{projectBrief}}

{{clarifications}}

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas dan teknis):

# WORKFLOW.md — Alur Kerja Development

## 1. Branching Strategy
\`\`\`
main        → production, selalu deployable
develop     → integrasi fitur sebelum ke main
feature/*   → 1 branch per fitur
fix/*       → bugfix
\`\`\`

## 2. Commit Convention
Conventional Commits: \`feat:\`, \`fix:\`, \`refactor:\`, \`docs:\`, \`test:\`, \`chore:\`

Contoh:
- \`feat: tambah fitur [nama]\`
- \`fix: perbaiki bug [deskripsi]\`
- \`refactor: refactor [komponen]\`

## 3. Environment
\`\`\`
development : .env.local — [deskripsi config development]
staging     : [config staging jika ada]
production  : [deskripsi config production — API key, database, dll]
\`\`\`

## 4. Checklist Sebelum Deploy ke Production
- [ ] [item paling kritis untuk project ini]
- [ ] [item keamanan — API key, env variable tidak bocor]
- [ ] [item testing — pastikan semua test lulus]
- [ ] [item performa — bundle size, load time]
- [ ] Debug mode off, error handling tidak membocorkan detail teknis
- [ ] Uji alur utama end-to-end di environment staging

## 5. CI/CD Pipeline
\`\`\`
Setiap push ke branch fitur    → run lint + unit test
Setiap PR ke develop/main      → run full test suite
Merge ke main                  → build + deploy otomatis ke [platform]
\`\`\`

## 6. Aturan untuk AI Terkait Workflow
1. AI tidak boleh langsung commit/push tanpa diminta eksplisit.
2. AI wajib menyarankan commit message sesuai convention di atas.
3. [tambahkan aturan khusus lain yang relevan untuk project ini]

---
Buat workflow yang realistis untuk ukuran tim dan kompleksitas project ini.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
