import type { NextConfig } from "next";

const securityHeaders = [
  // Cegah clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Cegah MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer — hanya kirim origin saat cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan fitur browser yang tidak dipakai
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS (hanya production — Vercel menambahkan ini juga, tapi eksplisit lebih baik)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // XSS Protection (header lama, tapi masih berguna untuk IE/old browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  // Mongoose harus di-exclude dari webpack bundling (runs server-side only)
  serverExternalPackages: ["mongoose"],

  images: {
    remotePatterns: [
      {
        // Google user avatar
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // GitHub user avatar
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        // Gravatar user avatar
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
    ],
  },

  // Security headers di semua response (SECURITY.md Bagian A prinsip 15)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Aktifkan strict mode untuk mendeteksi masalah React lebih cepat
  reactStrictMode: true,
};

export default nextConfig;

