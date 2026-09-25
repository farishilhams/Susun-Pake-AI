// ============================================================
// modules/files/templates/design.template.ts
// Template prompt untuk generate DESIGN.md
// Struktur mengacu pada DESIGN.md project ini sendiri
// ============================================================

export const DESIGN_TEMPLATE = `
Kamu adalah UI/UX designer ahli yang membantu developer mendokumentasikan sistem desain project mereka.

Buat file DESIGN.md untuk project berikut:

{{projectBrief}}

{{clarifications}}

Ikuti PERSIS struktur berikut (gunakan bahasa Indonesia yang jelas):

# DESIGN.md — {{projectName}}

## 1. Karakter & Identitas Visual Produk
\`\`\`
Tipe produk    : [tipe produk: SaaS/konsumen/enterprise/dll]
Target user    : [deskripsi target user dan preferensi visual mereka]
Kata kunci gaya: [3-5 kata kunci yang mendeskripsikan gaya visual]
Mood           : [nuansa emosional yang diinginkan]
\`\`\`

## 2. Design System

### Palet Warna
\`\`\`
Warna Primer   : [kode warna + nama]
Warna Sekunder : [kode warna + nama]
Warna Aksen    : [kode warna + nama]
Background     : [kode warna]
Surface        : [kode warna]
Teks Utama     : [kode warna]
Teks Sekunder  : [kode warna]
\`\`\`

### Tipografi
\`\`\`
Font Heading   : [nama font + weight]
Font Body      : [nama font + weight]
Font Mono      : [nama font — untuk kode/technical content]
Scale          : [xs/sm/base/lg/xl/2xl]
\`\`\`

### Spacing & Layout
\`\`\`
Grid           : [sistem grid yang dipakai]
Spacing scale  : [satuan spacing]
Border radius  : [nilai radius border]
\`\`\`

## 3. Komponen UI Kunci

### [Komponen 1: misal Landing Page]
- [deskripsi visual dan behavior]

### [Komponen 2: misal Dashboard]
- [deskripsi visual dan behavior]

[Tambahkan komponen sesuai kebutuhan project]

## 4. Prinsip UX
- [prinsip UX 1 yang kritis untuk product ini]
- [prinsip UX 2]
- [prinsip UX 3]

## 5. Aksesibilitas
- [standar aksesibilitas yang harus dipenuhi]
- [kontras warna minimum]
- [keyboard navigation requirements]

## 6. Panduan Responsif
\`\`\`
Mobile  : [breakpoint dan behavior]
Tablet  : [breakpoint dan behavior]
Desktop : [breakpoint dan behavior]
\`\`\`

---
Buat design system yang konsisten dan sesuai dengan karakter produk yang diberikan.
Output HANYA konten markdown, tanpa penjelasan tambahan di luar konten file.
`.trim();
