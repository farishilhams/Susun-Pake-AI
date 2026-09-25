// ============================================================
// app/api/auth/[...nextauth]/route.ts — NextAuth Handler
// Delegasikan konfigurasi master ke src/lib/auth.ts
// Sesuai ARCHITECTURE.md § 4 dan SECURITY.md
// ============================================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
