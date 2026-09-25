// ============================================================
// modules/files/templates/security.template.ts
// Template prompt untuk generate SECURITY.md
// Checklist keamanan dan prinsip keamanan aplikasi
// Struktur mengacu pada SECURITY.md project ini sendiri
// ============================================================

export const SECURITY_TEMPLATE = `
Kamu adalah security engineer ahli yang membantu developer mendokumentasikan praktik keamanan project mereka.

Buat file SECURITY.md untuk project berikut:

{{projectBrief}}

{{clarifications}}

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas dan teknis):

# SECURITY.md — {{projectName}}

> Dokumen keamanan ini mencakup prinsip, checklist, dan panduan keamanan spesifik untuk project ini.

## BAGIAN KHUSUS — Risiko & Mitigasi Utama Project Ini

Identifikasi 3-5 risiko keamanan PALING KRITIS untuk project ini berdasarkan tipe aplikasinya:

### Risiko 1: [Nama Risiko — misal: Unauthorized Access]
- **Dampak**: [apa yang terjadi jika terjadi]
- **Mitigasi**: [langkah konkret untuk mencegah]

### Risiko 2: [Nama Risiko]
- **Dampak**: [dampak]
- **Mitigasi**: [mitigasi]

[Ulangi untuk 3-5 risiko utama]

## Prinsip Keamanan (Bagian A)

### A1. Autentikasi & Otorisasi
- [aturan autentikasi spesifik untuk project ini]
- Pastikan user hanya bisa akses resource miliknya sendiri (cegah IDOR)

### A2. Manajemen Secret & API Key
- SEMUA API key dan secret disimpan di environment variable server-side
- TIDAK PERNAH hardcode secret di kode yang bisa diakses frontend
- [aturan tambahan sesuai jenis API yang dipakai]

### A3. Input Validation & Sanitization
- Validasi semua input dari user di server-side
- Sanitasi output untuk mencegah XSS
- [aturan tambahan sesuai kebutuhan project]

### A4. Rate Limiting & Abuse Prevention
- Terapkan rate limiting di semua endpoint yang bisa di-abuse
- [aturan spesifik untuk project ini]

### A5. Data Privacy
- [aturan perlindungan data user]
- [aturan retention data]

### A6. Error Handling
- Error message production tidak boleh membocorkan detail teknis stack
- Log error di server, tampilkan pesan generik ke user

[Tambahkan prinsip lain yang relevan: A7, A8, dst]

## Checklist Sebelum Deploy (Bagian B — Manual)

### Authentication & Authorization
- [ ] Semua endpoint yang butuh auth sudah diproteksi
- [ ] Tidak ada IDOR vulnerability di endpoint resource

### Secrets & Environment
- [ ] Tidak ada secret yang hardcode di codebase
- [ ] Environment variable production sudah dikonfigurasi dengan benar
- [ ] .env files tidak di-commit ke version control

### Input & Output
- [ ] Semua input user divalidasi di server-side
- [ ] Output di-sanitasi untuk mencegah XSS
- [ ] SQL injection / NoSQL injection tidak mungkin terjadi

### Rate Limiting
- [ ] Rate limiting aktif dan teruji di semua endpoint kritis
- [ ] [item checklist tambahan sesuai project]

### Database
- [ ] Database tidak exposed ke publik
- [ ] User database dengan permission minimal (principle of least privilege)
- [ ] Backup database dikonfigurasi

### Deployment
- [ ] Debug mode off di production
- [ ] HTTPS diaktifkan
- [ ] Security headers dikonfigurasi (HSTS, CSP, dll)
- [ ] [item deployment spesifik untuk platform yang dipakai]

---
Buat panduan keamanan yang spesifik untuk tech stack dan jenis data yang dikelola project ini.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
