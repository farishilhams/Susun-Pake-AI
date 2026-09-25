// ============================================================
// lib/api-response.ts — Standard API Response helper
// Pola persis sesuai SKILL.md § "Response API Standar"
// ============================================================

import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

/** Response sukses */
export function success<T>(
  data: T,
  message = "OK",
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, message },
    { status }
  );
}

/** Response error */
export function fail(
  message: string,
  error: unknown = null,
  status = 400
): NextResponse<ApiResponse> {
  // Jangan bocorkan stack trace di production
  const safeError =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : null;

  return NextResponse.json<ApiResponse>(
    { success: false, data: null, message, error: safeError },
    { status }
  );
}

/** Response 429 Rate Limit */
export function rateLimited(
  message = "Kuota generate harian sudah habis. Coba lagi besok."
): NextResponse<ApiResponse> {
  return NextResponse.json<ApiResponse>(
    { success: false, data: null, message, error: "RATE_LIMIT_EXCEEDED" },
    { status: 429 }
  );
}

/** Response 401 Unauthorized */
export function unauthorized(
  message = "Silakan login terlebih dahulu."
): NextResponse<ApiResponse> {
  return NextResponse.json<ApiResponse>(
    { success: false, data: null, message, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

/** Response 404 Not Found */
export function notFound(
  message = "Resource tidak ditemukan."
): NextResponse<ApiResponse> {
  return NextResponse.json<ApiResponse>(
    { success: false, data: null, message, error: "NOT_FOUND" },
    { status: 404 }
  );
}
