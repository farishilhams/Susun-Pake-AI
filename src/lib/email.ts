// ============================================================
// lib/email.ts — Layanan Pengiriman Email (Resend)
// Sesuai CLAUDE.md § 4, ARCHITECTURE.md, dan SECURITY.md
// ============================================================

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (process.env.RESEND_API_KEY) {
    if (!resendClient) {
      resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
  }
  return null;
}

export interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

/**
 * Kirim email berisi tautan reset kata sandi ke user.
 * Jika RESEND_API_KEY tidak diset (misal: di lokal dev / testing),
 * link akan dicetak ke konsol terminal server dengan format jelas.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const fromEmail =
    process.env.EMAIL_FROM || "Susun Pake AI <onboarding@resend.dev>";
  const resend = getResendClient();

  if (!resend) {
    console.log(
      "\n============================================================"
    );
    console.log("📨 [DEV EMAIL SIMULATOR] Reset Password Email");
    console.log(`Kepada     : ${name} <${to}>`);
    console.log(`Pengirim   : ${fromEmail}`);
    console.log(`Tautan URL : ${resetUrl}`);
    console.log("Catatan    : RESEND_API_KEY belum diset di .env.local.");
    console.log(
      "============================================================\n"
    );
    return { success: true };
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Kata Sandi — Susun Pake AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #1B2336; border: 1px solid #334155; border-radius: 12px; padding: 36px 32px; box-sizing: border-box;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; text-align: center; border-radius: 10px; background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25); font-size: 20px;">
                📄
              </div>
              <h1 style="margin: 12px 0 4px; font-size: 22px; font-weight: 700; color: #F8FAFC; letter-spacing: -0.02em;">
                Susun Pake AI
              </h1>
              <p style="margin: 0; font-size: 13px; color: #94A3B8;">
                Permintaan Pengaturan Ulang Kata Sandi
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; color: #E2E8F0; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 16px;">Halo <strong>${name}</strong>,</p>
              <p style="margin: 0 0 16px;">
                Kami menerima permintaan untuk mereset kata sandi akun Susun Pake AI Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #22C55E; color: #0F172A; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">
                  Reset Kata Sandi
                </a>
              </div>
              <p style="margin: 0 0 12px; font-size: 13px; color: #94A3B8;">
                Tautan ini hanya berlaku selama <strong>20 menit</strong>. Jika tautan kedaluwarsa, silakan ajukan permintaan ulang di aplikasi.
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748B; word-break: break-all;">
                Jika tombol di atas tidak dapat diklik, salin dan tempel URL berikut ke browser Anda:<br>
                <a href="${resetUrl}" style="color: #22C55E; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #334155; padding-top: 20px; font-size: 12px; color: #64748B; line-height: 1.5;">
              <p style="margin: 0 0 8px;">
                🛡️ <strong>Keamanan Akun:</strong> Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Kata sandi Anda akan tetap aman dan tidak akan diubah.
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Susun Pake AI. Platform Spesifikasi & Arsitektur Project.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Atur Ulang Kata Sandi Akun Susun Pake AI",
      html: htmlContent,
    });

    if (error) {
      console.error("Gagal mengirim email via Resend:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Kesalahan tidak terduga";
    console.error("Exception saat mengirim email:", message);
    return { success: false, error: message };
  }
}
