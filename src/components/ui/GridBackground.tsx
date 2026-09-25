"use client";

// ============================================================
// components/ui/GridBackground.tsx — Minimalist Grid Pattern with Edge Fade Mask
// Sesuai DESIGN.md § 3 (Technical, clean, developer tool)
// ============================================================

import React from "react";

interface GridBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  subtle?: boolean; // Versi lebih lembut untuk dashboard/editor
  size?: number; // Ukuran kotak grid dalam pixel (default 32px)
}

export default function GridBackground({
  children,
  className = "",
  style,
  subtle = false,
  size = 36,
}: GridBackgroundProps) {
  return (
    <div className={`relative ${className}`} style={style}>
      {/* Grid Canvas Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none select-none ${
          subtle ? "opacity-20" : "opacity-35"
        }`}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(51, 65, 85, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(51, 65, 85, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: `${size}px ${size}px`,
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, black 30%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 30%, transparent 85%)",
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
