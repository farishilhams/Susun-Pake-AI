"use client";

// ============================================================
// components/ui/MarqueeRow.tsx — Horizontal Infinite Marquee Row
// High-Performance Pure GPU Compositor CSS Animation
// Sesuai DESIGN.md § 6 Design Tokens & Anti-AI-Slop Rules
// ============================================================

import React from "react";

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
  const duplicatedItems = [...items, ...items];

  return (
    <div
      className={`relative w-full overflow-hidden py-3 select-none ${className}`}
    >
      <style>{`
        @keyframes marquee-scroll-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes marquee-scroll-right {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .marquee-track-left {
          animation: marquee-scroll-left ${speed}s linear infinite;
        }
        .marquee-track-right {
          animation: marquee-scroll-right ${speed}s linear infinite;
        }
        .marquee-container:hover .marquee-track-paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* Edge gradient mask (fade kiri & kanan) */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Animated Row (Pure GPU compositor thread) */}
      <div className="marquee-container flex overflow-hidden">
        <div
          className={`flex items-center gap-6 whitespace-nowrap w-max will-change-transform transform-gpu ${
            direction === "left" ? "marquee-track-left" : "marquee-track-right"
          } ${pauseOnHover ? "marquee-track-paused" : ""}`}
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
        </div>
      </div>
    </div>
  );
}
