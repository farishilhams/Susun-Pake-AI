"use client";

// ============================================================
// components/ui/GlassPill.tsx — Reusable Glassmorphism Primitive
// Menggunakan Framer Motion (Bukan GSAP) & Design Tokens DESIGN.md § 6
// ============================================================

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassPillProps extends HTMLMotionProps<"div"> {
  variant?: "pill" | "card" | "badge" | "button";
  glow?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function GlassPill({
  variant = "pill",
  glow = false,
  children,
  className = "",
  ...props
}: GlassPillProps) {
  const baseStyles =
    "relative overflow-hidden backdrop-blur-md transition-colors border";

  const variantStyles = {
    pill: "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface/70 border-white/10 text-foreground shadow-sm",
    badge: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-surface/50 border-white/5 text-muted-fg",
    card: "p-6 rounded-2xl bg-surface/70 border-white/10 text-foreground shadow-xl hover:border-primary/40",
    button: "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-surface/80 border-white/10 hover:bg-surface hover:border-primary/50 text-foreground cursor-pointer shadow-md",
  };

  return (
    <motion.div
      whileHover={
        variant === "card"
          ? { y: -3, transition: { duration: 0.25, ease: "easeOut" } }
          : variant === "button"
          ? { scale: 1.02, transition: { duration: 0.15 } }
          : undefined
      }
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Subtle glass reflection gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.07] to-transparent pointer-events-none" />

      {/* Optional ambient glow at edge */}
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-emerald-400/20 rounded-full blur-sm opacity-50 -z-10 pointer-events-none" />
      )}

      {children}
    </motion.div>
  );
}
