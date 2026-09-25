"use client";

// ============================================================
// components/ui/AuroraBackground.tsx — Radial Aurora Gradient Background
// Menggunakan warna primer & sekunder dari DESIGN.md § 6
// ============================================================

import React from "react";
import { motion } from "framer-motion";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: "subtle" | "medium" | "vibrant";
}

export default function AuroraBackground({
  children,
  className = "",
  style,
  intensity = "medium",
}: AuroraBackgroundProps) {
  const opacityMap = {
    subtle: "opacity-15",
    medium: "opacity-25",
    vibrant: "opacity-40",
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Aurora Ambient Glow Layers */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${opacityMap[intensity]}`}>
        {/* Primary Green Glow (Run Green) */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[20%] left-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/60 via-emerald-600/30 to-transparent blur-3xl"
        />

        {/* Deep Slate / Blue Secondary Glow */}
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            x: [0, -25, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[30%] -right-[10%] w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-teal-500/30 via-slate-800/40 to-transparent blur-3xl"
        />

        {/* Center Bottom Ambient Accent */}
        <div className="absolute -bottom-[20%] left-[30%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
