"use client";

// ============================================================
// components/layout/Navbar.tsx — Standardized Global Navbar
// Single Source of Truth for Navigation across Susun Pake AI
// Cinematic Glass Theme (Framer Motion, GlassPill, ThemeToggle)
// Fitur: Avatar User, Initial Fallback, Dropdown Akun, Mobile Drawer
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  MagneticButton,
  ThemeToggle,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  anchor: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Fitur", href: "/#fitur", anchor: "#fitur" },
  { label: "Alur Kerja", href: "/#alur-kerja", anchor: "#alur-kerja" },
  { label: "Statistik", href: "/#statistik", anchor: "#statistik" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const isHome = pathname === "/";

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Tutup menu dropdown akun & drawer mobile saat berpindah rute
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  // Tutup menu dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Tutup menu dengan tombol keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle smooth scroll untuk tautan anchor jika di landing page
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    anchor: string
  ) => {
    if (isHome && anchor.startsWith("#")) {
      e.preventDefault();
      setMobileMenuOpen(false);
      const targetId = anchor.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setMobileMenuOpen(false);
    }
  };

  const userDisplayName = session?.user?.name || "Developer";
  const userDisplayEmail = session?.user?.email || "";

  // State cadangan dari direct fetch MongoDB jika session client masih kosong sesaat setelah sign-in
  const [dbAvatar, setDbAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !session?.user?.image && !(session?.user as any)?.avatar_url) {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.data) {
            const avatar = data.data.image || data.data.avatar_url;
            if (avatar) setDbAvatar(avatar);
          }
        })
        .catch(() => {});
    }
  }, [status, session?.user?.image]);

  // Fallback berurutan sesuai ARCHITECTURE & UI specifications
  const profileImage =
    session?.user?.image ||
    (session?.user as any)?.avatar_url ||
    (session?.user as any)?.avatarUrl ||
    dbAvatar ||
    null;

  const userInitials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
          onClick={() => {
            setMobileMenuOpen(false);
            setAccountMenuOpen(false);
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-surface border border-white/10 flex items-center justify-center shadow-inner group-hover:border-primary/40 transition-colors">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
              Susun Pake AI
            </span>
            <span className="text-[11px] text-muted-fg font-mono hidden sm:block">
              Spesifikasi &amp; Arsitektur Project
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono text-muted-fg">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={isHome ? item.anchor : item.href}
              onClick={(e) => handleAnchorClick(e, item.anchor)}
              className="hover:text-foreground transition-colors cursor-pointer py-1"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop Right Actions: Optimistic Rendering (Zero Layout Shift) */}
          {status === "authenticated" && session ? (
            <div className="flex items-center gap-2">
              <MagneticButton
                id="nav-dashboard-btn"
                href="/dashboard"
                variant="primary"
                strength={0.2}
                className="px-3.5 py-1.5 text-xs font-mono flex items-center gap-1.5 shadow-sm"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </MagneticButton>

              {/* Dropdown Akun Pengguna */}
              <div ref={accountMenuRef} className="relative">
                <button
                  id="nav-account-dropdown-trigger"
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-label="Menu akun pengguna"
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer group"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-primary/40 group-hover:border-primary transition-colors bg-surface shadow-sm">
                      <AvatarImage
                        src={profileImage || ""}
                        alt={userDisplayName || "User Avatar"}
                        className="object-cover"
                      />
                      <AvatarFallback className="w-full h-full bg-slate-800 text-emerald-400 font-mono font-bold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background pointer-events-none" />
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted-fg group-hover:text-foreground transition-transform duration-200 ${
                      accountMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Popover */}
                <AnimatePresence>
                  {accountMenuOpen && (
                    <motion.div
                      id="nav-account-dropdown-menu"
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-50 overflow-hidden"
                    >
                      {/* Informasi Akun Header (Non-clickable) */}
                      <div className="p-3 bg-surface-hover/60 rounded-xl border border-border/40 mb-1.5 flex items-center gap-3">
                        <Avatar className="w-10 h-10 shrink-0 ring-1 ring-primary/40 bg-surface">
                          <AvatarImage
                            src={profileImage || ""}
                            alt={userDisplayName || "User Avatar"}
                            className="object-cover"
                          />
                          <AvatarFallback className="w-full h-full bg-slate-800 text-emerald-400 font-mono font-bold text-xs">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold font-mono text-foreground truncate">
                            {userDisplayName}
                          </p>
                          <p className="text-[11px] font-mono text-muted-fg truncate">
                            {userDisplayEmail}
                          </p>
                        </div>
                      </div>

                      {/* Navigasi Dropdown */}
                      <div className="space-y-1">
                        <Link
                          id="account-menu-dashboard"
                          href="/dashboard"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-foreground/90 hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer group"
                        >
                          <LayoutDashboard className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                          <span>Dashboard Project</span>
                        </Link>

                        <div className="h-px bg-border/50 my-1" />

                        <button
                          id="account-menu-logout"
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            signOut({ callbackUrl: "/", redirect: true });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer group"
                        >
                          <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          <span>Keluar dari Akun</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                id="nav-login-link"
                href="/login"
                className="text-xs font-mono text-muted-fg hover:text-foreground px-3.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface/50 transition-colors"
              >
                Masuk
              </Link>
              <MagneticButton
                id="nav-register-btn"
                href="/register"
                variant="primary"
                strength={0.2}
                className="px-3.5 py-1.5 text-xs font-mono flex items-center gap-1.5 shadow-sm"
              >
                <span>Mulai Gratis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </MagneticButton>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Theme Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            id="mobile-nav-toggle"
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface/60 border border-border/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-primary" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Framer Motion) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="md:hidden border-b border-border/80 bg-background/95 backdrop-blur-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-6 space-y-4">
              {/* Mobile Navigation Links */}
              <div className="flex flex-col space-y-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={isHome ? item.anchor : item.href}
                    onClick={(e) => handleAnchorClick(e, item.anchor)}
                    className="px-3 py-2.5 rounded-lg text-sm font-mono text-muted-fg hover:text-foreground hover:bg-surface/50 transition-colors flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-fg/60" />
                  </Link>
                ))}
              </div>

              <div className="border-t border-border/50 pt-4">
                {/* Mobile Auth Actions: Optimistic Rendering */}
                {status === "authenticated" && session ? (
                  <div className="space-y-3">
                    {/* Kartu Profil Mobile */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border/60">
                      <Avatar className="w-11 h-11 shrink-0 ring-1 ring-primary/40 bg-surface">
                        <AvatarImage
                          src={profileImage || ""}
                          alt={userDisplayName || "User Avatar"}
                          className="object-cover"
                        />
                        <AvatarFallback className="w-full h-full bg-slate-800 text-emerald-400 font-mono font-bold text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-foreground truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-[11px] font-mono text-muted-fg truncate">
                          {userDisplayEmail}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-fg text-xs font-mono font-semibold shadow-md active:scale-[0.98] transition-all"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Buka Dashboard</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut({ callbackUrl: "/", redirect: true });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-mono transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center py-2.5 px-3 rounded-xl border border-border bg-surface text-sm font-mono text-foreground hover:bg-surface-hover transition-colors text-center"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary text-primary-fg text-sm font-mono font-semibold shadow-md active:scale-[0.98] transition-all text-center"
                    >
                      <span>Mulai Gratis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
