"use client";

// ============================================================
// components/ui/MarqueeRow.tsx — Horizontal Infinite Marquee Row
// Menggunakan Framer Motion (repeat: Infinity, linear ease)
// Sesuai DESIGN.md § 6 Design Tokens & Anti-AI-Slop Rules
// ============================================================

import React from "react";
import { motion } from "framer-motion";

interface MarqueeRowProps {
  items: (string | React.ReactNode)[];
  speed?: number; // Detik untuk satu putaran penuh
  direction?: "left" | "right";
  className?: string;
  pauseOnHover?: boolean;
}

export default function MarqueeRow({
  items,
  speed = 28,
  direction = "left",
  className = "",
  pauseOnHover = true,
}: MarqueeRowProps) {
  // Gandakan array 2x agar loop terasa seamless tanpa jeda kosong
  const duplicatedItems = [...items, ...items, ...items, ...items];

  const animateX = direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"];

  return (
    <div
      className={`relative w-full overflow-hidden py-3 select-none ${className}`}
    >
      {/* Edge gradient mask (fade kiri & kanan) */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Animated Row */}
      <motion.div
        animate={{ x: animateX }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
        className="flex items-center gap-6 whitespace-nowrap w-max"
      >
        {duplicatedItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-6">
            {typeof item === "string" ? (
              <span className="inline-flex items-center gap-2 text-xs font-mono font-medium text-muted-fg hover:text-foreground transition-colors px-3 py-1 rounded-full bg-surface/40 border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                {item}
              </span>
            ) : (
              item
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
