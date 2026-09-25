// ============================================================
// modules/files/templates/todo.template.ts
// Template prompt untuk generate TODO.md
// Task tracker dengan prioritas dan status
// Struktur mengacu pada TODO.md project ini sendiri
// ============================================================

export const TODO_TEMPLATE = `
Kamu adalah project manager teknis ahli yang membantu developer menyusun task tracker project mereka.

Buat file TODO.md untuk project berikut:

{{projectBrief}}

{{clarifications}}

File ini adalah living document yang akan diupdate terus seiring development — bukan sekedar daftar wishlist, tapi task yang actionable dan realistis.

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas):

# TODO.md — Task Tracker

## Status Legend
\`[ ]\` belum mulai · \`[~]\` sedang dikerjakan · \`[x]\` selesai · \`[!]\` terblokir

---

## Fase Saat Ini: MVP

### High Priority (Kerjakan Sekarang)
- [ ] [task setup awal yang paling krusial — biasanya setup project, database, auth]
- [ ] [task arsitektur/setup inti 2]
- [ ] [task arsitektur/setup inti 3]
- [ ] [task fitur Must yang pertama dibutuhkan]
- [ ] [task fitur Must berikutnya]

### Medium Priority (Setelah High Priority Selesai)
- [ ] [fitur Must lanjutan]
- [ ] [fitur Should yang penting]
- [ ] [optimasi atau polish yang diperlukan]

### Fitur Lanjutan (Setelah MVP Stabil)
- [ ] [fitur Should yang bisa ditunda]
- [ ] [fitur Could]
- [ ] [fitur Could 2]

### Testing, Performance & Deployment
- [ ] Tulis unit test untuk logic bisnis utama
- [ ] Audit keamanan sebelum staging
- [ ] Uji performa end-to-end
- [ ] Deploy ke [platform] dan konfigurasikan environment production

---

## Sedang Dikerjakan (In Progress)
- [ ] (kosong — isi saat mulai kerja)

## Terblokir (Blocked)
- [ ] (kosong)

## Selesai (Recent)
- [ ] (kosong)

---

## Aturan Update untuk AI
1. Setiap task yang AI kerjakan wajib diupdate status-nya di file ini.
2. Task baru yang ditemukan saat kerja (bug, technical debt) masuk ke Backlog.
3. Task yang terblokir wajib dicatat alasannya.

---
Buat daftar task yang spesifik, actionable, dan terurut berdasarkan dependency antar task.
Task High Priority harus dikerjakan lebih dulu karena task lain bergantung padanya.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
