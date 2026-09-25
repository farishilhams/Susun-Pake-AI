import { redirect } from "next/navigation";

// ============================================================
// app/(auth)/register/page.tsx — Rute Pendaftaran Akun Baru
// Mengarahkan alur orientasi pengguna baru secara definitif ke tab registrasi
// ============================================================

export default function RegisterPage() {
  redirect("/login?mode=signup");
}
