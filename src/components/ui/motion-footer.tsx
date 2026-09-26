"use client";

// ============================================================
// components/ui/motion-footer.tsx — Cinematic Footer (GSAP ScrollTrigger)
// Optimized for 60/120 FPS performance: Zero layout thrashing,
// cached getBoundingClientRect with rAF, native hardware acceleration,
// and zero render-blocking dynamic @import fonts.
// ============================================================

import * as React from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Terminal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Register ScrollTrigger safely for React & SSR environments
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// -------------------------------------------------------------------------
// 1. THEME-ADAPTIVE INLINE STYLES (Performance-Tuned)
// -------------------------------------------------------------------------
const STYLES = `
.cinematic-footer-wrapper {
  font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  
  /* Dynamic Variables using standard shadcn/tailwind tokens with robust fallbacks */
  --pill-bg-1: color-mix(in oklch, var(--foreground, #fff) 5%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground, #fff) 2%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background, #080c16) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground, #fff) 12%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background, #080c16) 70%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground, #fff) 10%, transparent);
  
  --pill-bg-1-hover: color-mix(in oklch, var(--foreground, #fff) 10%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground, #fff) 4%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground, #fff) 25%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background, #080c16) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground, #fff) 25%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate3d(-50%, -50%, 0) scale(1); opacity: 0.6; }
  100% { transform: translate3d(-50%, -50%, 0) scale(1.08); opacity: 0.95; }
}

@keyframes footer-scroll-marquee {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.4)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.7)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 35s linear infinite;
  will-change: transform;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

/* Theme-adaptive Grid Background */
.footer-bg-grid {
  background-size: 60px 60px;
  background-image: 
    linear-gradient(to right, color-mix(in oklch, var(--foreground, #fff) 3%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground, #fff) 3%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
}

/* Theme-adaptive Aurora Glow (Optimized Blur Radius for GPU Fill-Rate) */
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    rgba(56, 189, 248, 0.16) 0%, 
    rgba(99, 102, 241, 0.12) 35%, 
    rgba(168, 85, 247, 0.08) 55%, 
    transparent 75%
  );
  filter: blur(48px);
}

/* Glass Pill Theming (Lightweight Blur for Smooth 60fps) */
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 
      0 10px 24px -10px var(--pill-shadow), 
      inset 0 1px 1px var(--pill-highlight), 
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 
      0 16px 32px -10px var(--pill-shadow-hover), 
      inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

/* Giant Background Text Masking */
.footer-giant-bg-text {
  font-size: 21vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground, #fff) 6%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground, #fff) 12%, transparent) 0%, transparent 65%);
  -webkit-background-clip: text;
  background-clip: text;
  will-change: transform, opacity;
}

/* Metallic Text Glow */
.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground, #fff) 0%, color-mix(in oklch, var(--foreground, #fff) 45%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 16px color-mix(in oklch, var(--foreground, #fff) 15%, transparent));
}
`;

// -------------------------------------------------------------------------
// 2. MAGNETIC BUTTON PRIMITIVE (Zero Forced Reflow + rAF Throttled)
// -------------------------------------------------------------------------
export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & 
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
    href?: string;
  };

export const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      // Cache bounding rect to prevent forced reflow on mousemove
      let cachedRect: DOMRect | null = null;
      let rafId: number | null = null;

      const ctx = gsap.context(() => {
        const handleMouseEnter = () => {
          cachedRect = element.getBoundingClientRect();
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (!cachedRect) cachedRect = element.getBoundingClientRect();
          if (rafId !== null) return;

          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (!cachedRect) return;

            const h = cachedRect.width / 2;
            const w = cachedRect.height / 2;
            const x = e.clientX - cachedRect.left - h;
            const y = e.clientY - cachedRect.top - w;

            gsap.to(element, {
              x: x * 0.35,
              y: y * 0.35,
              rotationX: -y * 0.1,
              rotationY: x * 0.1,
              scale: 1.04,
              ease: "power2.out",
              duration: 0.35,
              overwrite: "auto",
            });
          });
        };

        const handleMouseLeave = () => {
          cachedRect = null;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }

          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.4)",
            duration: 0.8,
            overwrite: "auto",
          });
        };

        element.addEventListener("mouseenter", handleMouseEnter, { passive: true });
        element.addEventListener("mousemove", handleMouseMove, { passive: true });
        element.addEventListener("mouseleave", handleMouseLeave, { passive: true });

        return () => {
          element.removeEventListener("mouseenter", handleMouseEnter);
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
          if (rafId !== null) cancelAnimationFrame(rafId);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

// -------------------------------------------------------------------------
// 3. MARQUEE BANNER ITEM (Susun Pake AI Value Proposition)
// -------------------------------------------------------------------------
const MarqueeItem = () => (
  <div className="flex items-center space-x-10 px-6 font-mono select-none">
    <span>Spec Generator</span> <span className="text-primary/70">✦</span>
    <span>Real-Time Live Preview</span> <span className="text-secondary/70">✦</span>
    <span>Architecture Blueprint</span> <span className="text-primary/70">✦</span>
    <span>Clean Vibe Coding</span> <span className="text-secondary/70">✦</span>
    <span>Zero Hardcode</span> <span className="text-primary/70">✦</span>
  </div>
);

// -------------------------------------------------------------------------
// 4. MAIN CINEMATIC FOOTER COMPONENT
// -------------------------------------------------------------------------
export function CinematicFooter() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && Boolean(session);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    // React Strict Mode & Next.js compatible GSAP context cleanup
    const ctx = gsap.context(() => {
      // 1. Giant Background Watermark Parallax
      if (giantTextRef.current) {
        gsap.fromTo(
          giantTextRef.current,
          { y: "8vh", scale: 0.85, opacity: 0 },
          {
            y: "0vh",
            scale: 1,
            opacity: 1,
            ease: "power1.out",
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: "top 85%",
              end: "bottom bottom",
              scrub: 1,
            },
          }
        );
      }

      // 2. Staggered Content Reveal
      if (headingRef.current && linksRef.current) {
        gsap.fromTo(
          [headingRef.current, linksRef.current],
          { y: 35, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: wrapperRef.current,
              start: "top 50%",
              end: "bottom bottom",
              scrub: 1,
            },
          }
        );
      }
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* 
        The "Curtain Reveal" Wrapper:
        Optimized with contain: "paint" and transform-gpu so the browser
        can scroll smoothly without full-document repainting.
      */}
      <div
        ref={wrapperRef}
        className="relative h-screen w-full min-h-[600px] overflow-hidden transform-gpu"
        style={{
          clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)",
          contain: "paint",
        }}
      >
        {/* The actual footer stays fixed to viewport underneath everything */}
        <footer className="fixed bottom-0 left-0 flex h-screen min-h-[600px] w-full flex-col justify-between overflow-hidden bg-background text-foreground cinematic-footer-wrapper transform-gpu">
          {/* Ambient Light & Grid Background */}
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[55vh] w-[75vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background text: SUSUN PAKE AI */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text font-mono absolute -bottom-[3vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
          >
            SUSUN PAKE AI
          </div>

          {/* 1. Diagonal Sleek Marquee (Top of footer) */}
          <div className="absolute top-6 sm:top-10 left-0 w-full overflow-hidden border-y border-border/50 bg-background/70 backdrop-blur-md py-3 sm:py-3.5 z-10 -rotate-2 scale-110 shadow-xl">
            <div className="flex w-max animate-footer-scroll-marquee text-[10px] sm:text-xs font-bold tracking-[0.25em] text-muted-foreground uppercase">
              <MarqueeItem />
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          {/* 2. Main Center Content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 mt-14 sm:mt-18 w-full max-w-5xl mx-auto">
            <h2
              ref={headingRef}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black footer-text-glow tracking-tighter mb-6 sm:mb-8 text-center"
            >
              Siap Susun Project Kamu?
            </h2>

            {/* Interactive Magnetic Pills Layout */}
            <div ref={linksRef} className="flex flex-col items-center gap-4 sm:gap-6 w-full">
              {/* Web SaaS Action Button (Auth-Aware Single Action, Zero Duplicate) */}
              <div className="flex justify-center w-full">
                {/* Primary Button: Mulai Susun Project (Auth-Aware CTA) */}
                <MagneticButton
                  as={Link}
                  href={isAuthenticated ? "/new-project" : "/register"}
                  id="footer-cta-register"
                  className="footer-glass-pill px-6 py-3.5 sm:px-9 sm:py-4.5 rounded-full text-foreground font-bold text-xs sm:text-sm md:text-base flex items-center gap-2.5 group shadow-lg"
                >
                  <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                  <span>{isAuthenticated ? "Bikin Project Baru Sekarang" : "Mulai Susun Project Gratis"}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform duration-300" />
                </MagneticButton>
              </div>

              {/* Secondary Navigation Links (Single Source of Truth, 100% Unique) */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 w-full mt-1">
                <MagneticButton
                  as={Link}
                  href="/#fitur"
                  id="footer-link-fitur"
                  className="footer-glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-muted-foreground font-medium text-xs sm:text-sm hover:text-foreground"
                >
                  Fitur
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href="/#alur-kerja"
                  id="footer-link-alur-kerja"
                  className="footer-glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-muted-foreground font-medium text-xs sm:text-sm hover:text-foreground"
                >
                  Alur Kerja
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href="/#statistik"
                  id="footer-link-statistik"
                  className="footer-glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-muted-foreground font-medium text-xs sm:text-sm hover:text-foreground"
                >
                  Statistik
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href={isAuthenticated ? "/dashboard" : "/login"}
                  id="footer-link-auth"
                  className="footer-glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-muted-foreground font-medium text-xs sm:text-sm hover:text-foreground"
                >
                  {isAuthenticated ? "Dashboard" : "Masuk Akun"}
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* 3. Bottom Bar / Credits (Zero Back to Top Button per Absolute Rules) */}
          <div className="relative z-20 w-full pb-6 sm:pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6">
            {/* Copyright */}
            <div className="text-muted-foreground text-[10px] sm:text-xs font-semibold tracking-widest uppercase order-2 md:order-1 text-center md:text-left">
              © 2026 Susun Pake AI. All rights reserved.
            </div>

            {/* "Made with Love" Badge adapted for Susun Pake AI */}
            <div className="footer-glass-pill px-4 sm:px-6 py-2 sm:py-2.5 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-border/50">
              <span className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                Crafted with
              </span>
              <span className="animate-footer-heartbeat text-sm sm:text-base text-destructive">
                ❤
              </span>
              <span className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                for
              </span>
              <span className="text-foreground font-black text-xs sm:text-sm tracking-normal ml-1">
                Susun Pake AI Builders
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default CinematicFooter;
