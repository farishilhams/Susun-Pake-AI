// ============================================================
// modules/consultation/starter-prompts.ts — Dynamic Starter Prompts
//
// Repositori topik dan starter prompt dinamis untuk konsultasi AI.
// Mendukung pengacakan real-time, kategorisasi topik arsitektur,
// dan pemfilteran interaktif.
// ============================================================

export interface StarterPromptItem {
  id: string;
  category: "architecture" | "vibecoding" | "security" | "database" | "scale";
  categoryLabel: string;
  badge: string;
  text: string;
  tag: string;
}

export interface PromptCategoryOption {
  id: string;
  label: string;
  iconName?: string;
}

export const PROMPT_CATEGORIES: PromptCategoryOption[] = [
  { id: "all", label: "Semua Topik" },
  { id: "architecture", label: "Arsitektur Sistem" },
  { id: "vibecoding", label: "Vibe Coding & AI" },
  { id: "security", label: "Keamanan & Auth" },
  { id: "database", label: "Database & Skema" },
  { id: "scale", label: "MVP & Skalabilitas" },
];

export const STARTER_PROMPTS_POOL: StarterPromptItem[] = [
  // ── 1. Arsitektur Sistem ──
  {
    id: "arch-1",
    category: "architecture",
    categoryLabel: "Arsitektur Sistem",
    badge: "Arsitektur",
    text: "Rekomendasi arsitektur database multi-tenant di MongoDB vs PostgreSQL untuk aplikasi SaaS B2B?",
    tag: "Multi-Tenancy",
  },
  {
    id: "arch-2",
    category: "architecture",
    categoryLabel: "Arsitektur Sistem",
    badge: "Desain Sistem",
    text: "Kapan sebaiknya memisahkan Next.js API Routes ke microservice Go atau Express terpisah saat trafik naik?",
    tag: "Microservices",
  },
  {
    id: "arch-3",
    category: "architecture",
    categoryLabel: "Arsitektur Sistem",
    badge: "Asynchronous",
    text: "Strategi implementasi background job queue (BullMQ/QStash) untuk proses kompilasi AI asynchronous tanpa timeout?",
    tag: "Task Queue",
  },
  {
    id: "arch-4",
    category: "architecture",
    categoryLabel: "Arsitektur Sistem",
    badge: "Webhook",
    text: "Bagaimana mendesain webhook listener yang tahan idempotensi dan anti-duplikasi saat ada retry otomatis?",
    tag: "Idempotency",
  },

  // ── 2. Vibe Coding & AI Assistant ──
  {
    id: "vibe-1",
    category: "vibecoding",
    categoryLabel: "Vibe Coding & AI",
    badge: "Context Anchor",
    text: "Cara efektif menstrukturkan PRD.md dan CLAUDE.md agar Claude Code & Cursor tidak halusinasi saat coding?",
    tag: "Context Window",
  },
  {
    id: "vibe-2",
    category: "vibecoding",
    categoryLabel: "Vibe Coding & AI",
    badge: "Pola Folder",
    text: "Pola arsitektur modular apa yang paling ramah untuk AI coding agent agar tidak merusak kode di file lain?",
    tag: "Modular Code",
  },
  {
    id: "vibe-3",
    category: "vibecoding",
    categoryLabel: "Vibe Coding & AI",
    badge: "Agent Rules",
    text: "Bagaimana teknik membuat sistem design rules di DESIGN.md agar UI buatan AI tetap konsisten dan premium?",
    tag: "Design Tokens",
  },
  {
    id: "vibe-4",
    category: "vibecoding",
    categoryLabel: "Vibe Coding & AI",
    badge: "Workflow",
    text: "Strategi micro-tasking untuk merombak fitur besar menjadi instruksi commit mikroskopis yang aman untuk AI?",
    tag: "Step-by-Step",
  },

  // ── 3. Keamanan & Auth ──
  {
    id: "sec-1",
    category: "security",
    categoryLabel: "Keamanan & Auth",
    badge: "Autentikasi",
    text: "Strategi autentikasi modern di Next.js: NextAuth JWT vs Database Sessions vs Iron Session untuk SaaS?",
    tag: "NextAuth / JWT",
  },
  {
    id: "sec-2",
    category: "security",
    categoryLabel: "Keamanan & Auth",
    badge: "IDOR Defense",
    text: "Cara mencegah kerentanan IDOR (Insecure Direct Object References) pada endpoint update dan delete dokumen?",
    tag: "Access Control",
  },
  {
    id: "sec-3",
    category: "security",
    categoryLabel: "Keamanan & Auth",
    badge: "Rate Limit",
    text: "Bagaimana implementasi rate limiting bertingkat (per IP, per user tier, dan per route) di Edge Runtime?",
    tag: "Rate Limiter",
  },
  {
    id: "sec-4",
    category: "security",
    categoryLabel: "Keamanan & Auth",
    badge: "Secret Guard",
    text: "Best practice pencegahan kebocoran kredensial database dan API keys di repositori publik (pre-commit hook)?",
    tag: "Secret Sanitization",
  },

  // ── 4. Database & Skema ──
  {
    id: "db-1",
    category: "database",
    categoryLabel: "Database & Skema",
    badge: "Indexing",
    text: "Kapan menggunakan partial unique index di MongoDB dan bagaimana perbandingannya dengan compound index?",
    tag: "Mongoose Index",
  },
  {
    id: "db-2",
    category: "database",
    categoryLabel: "Database & Skema",
    badge: "Migration",
    text: "Bagaimana merancang migration schema database tanpa downtime (Zero-Downtime Migration) pada aplikasi live?",
    tag: "Schema Migration",
  },
  {
    id: "db-3",
    category: "database",
    categoryLabel: "Database & Skema",
    badge: "Agregasi",
    text: "Optimasi performa query analitik agregasi besar tanpa membebani database operasional (Read Replica vs Pipeline)?",
    tag: "Aggregation Pipeline",
  },
  {
    id: "db-4",
    category: "database",
    categoryLabel: "Database & Skema",
    badge: "Audit Trail",
    text: "Pola desain skema riwayat versi dokumen dan audit log perubahan pengguna yang hemat storage?",
    tag: "Versioning",
  },

  // ── 5. MVP & Skalabilitas ──
  {
    id: "scale-1",
    category: "scale",
    categoryLabel: "MVP & Skalabilitas",
    badge: "Product Strategy",
    text: "Bagaimana memprioritaskan fitur inti MVP agar rilis dalam 2 minggu tanpa technical debt berlebihan?",
    tag: "Rapid Prototyping",
  },
  {
    id: "scale-2",
    category: "scale",
    categoryLabel: "MVP & Skalabilitas",
    badge: "Caching",
    text: "Pola caching hirarkis Next.js: perbandingan antara unstable_cache, Redis L2 cache, dan browser HTTP headers?",
    tag: "Cache Hierarchy",
  },
  {
    id: "scale-3",
    category: "scale",
    categoryLabel: "MVP & Skalabilitas",
    badge: "Serverless",
    text: "Arsitektur penanganan lonjakan trafik (flash crowd) pada platform SaaS menggunakan serverless edge computing?",
    tag: "Edge Scaling",
  },
  {
    id: "scale-4",
    category: "scale",
    categoryLabel: "MVP & Skalabilitas",
    badge: "Payment Webhook",
    text: "Bagaimana merancang arsitektur integrasi payment gateway (Midtrans/Stripe) yang tahan kegagalan koneksi?",
    tag: "Fintech Webhooks",
  },
];

/**
 * Mengambil sekumpulan starter prompt yang diacak secara dinamis.
 * Jika kategori ditentukan selain 'all', filter berdasarkan kategori tersebut.
 */
export function getDynamicStarterPrompts(
  count = 4,
  category = "all"
): StarterPromptItem[] {
  const eligible =
    category === "all"
      ? STARTER_PROMPTS_POOL
      : STARTER_PROMPTS_POOL.filter((item) => item.category === category);

  // Fisher-Yates shuffle salinan array
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
