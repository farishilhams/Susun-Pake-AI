// ============================================================
// lib/admin.ts — Helper verifikasi hak akses administrator
// Khusus akun Farish / owner atau email whitelist
// ============================================================

export const DEFAULT_ADMIN_EMAILS = [
  "farishilham.s@gmail.com",
  "syahranifarish@gmail.com",
];

export const DEFAULT_ADMIN_EMAIL = DEFAULT_ADMIN_EMAILS[0];

export function getAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const defaults = DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
  const set = new Set([...defaults, ...envAdmins]);
  return Array.from(set);
}

export function isUserAdmin(
  user?: { email?: string | null; role?: string | null } | null
): boolean {
  if (!user || !user.email) return false;

  const email = user.email.trim().toLowerCase();
  const adminEmails = getAdminEmails();

  if (adminEmails.includes(email)) return true;
  if (user.role === "admin") return true;

  return false;
}
