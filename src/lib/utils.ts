// ============================================================
// lib/utils.ts — Utility Functions (shadcn / Tailwind standard)
// ============================================================

export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | number | string | undefined | null }
  | ClassValue[];

/**
 * Class name merging helper compatible with shadcn/ui conventions.
 * Combines conditional class names and arrays cleanly without external dependencies.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

/**
 * Ekstraksi inisial nama pengguna (misal: "Farish Ilham Syahrani" -> "FI")
 * Standar dan konsisten di seluruh antarmuka Susun Pake AI
 */
export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const clean = email.trim().split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    if (clean.length >= 2) {
      return clean.slice(0, 2).toUpperCase();
    }
    if (clean.length === 1) {
      return clean.toUpperCase();
    }
  }
  return "SP";
}
