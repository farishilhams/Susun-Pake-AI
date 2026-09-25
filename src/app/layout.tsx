import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

// Standar viewport modern untuk mengeliminasi bug auto-zoom pada perangkat nyata
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Inter — clean, professional, cocok untuk developer tool (DESIGN.md § 3)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// JetBrains Mono — untuk code/markdown editor
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Susun Pake AI — Spesifikasi & Arsitektur Project Otomatis",
    template: "%s | Susun Pake AI",
  },
  description:
    "Susun spesifikasi dan arsitektur project kamu langsung beres, lengkap dengan skema database visual, standar keamanan, dan prompt context siap pakai dalam hitungan menit.",
  keywords: [
    "Susun Pake AI",
    "spesifikasi project",
    "arsitektur perangkat lunak",
    "diagram basis data",
    "PRD generator",
    "dokumen spesifikasi",
    "software architecture",
    "developer tool",
    "vibe coding",
  ],
  authors: [{ name: "Susun Pake AI" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Susun Pake AI",
    title: "Susun Pake AI — Spesifikasi & Arsitektur Project Otomatis",
    description:
      "Susun spesifikasi dan arsitektur project kamu langsung beres, lengkap dengan skema database visual, standar keamanan, dan prompt context siap pakai dalam hitungan menit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Susun Pake AI — Spesifikasi & Arsitektur Project Otomatis",
    description:
      "Susun spesifikasi dan arsitektur project kamu langsung beres, lengkap dengan skema database visual, standar keamanan, dan prompt context siap pakai dalam hitungan menit.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full w-full overflow-x-hidden antialiased`}
      data-theme="dark"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('susun-pake-ai-theme') || localStorage.getItem('susunpakeai-theme') || 'dark';
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full w-full overflow-x-hidden flex flex-col bg-background text-foreground transition-colors duration-200">
        <SessionProvider session={session}>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

