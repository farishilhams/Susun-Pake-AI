"use client";

// ============================================================
// components/ui/MagneticButton.tsx — Magnetic Button Primitive
// Menggunakan useSpring & useMotionValue Framer Motion (Bukan GSAP)
// Bergerak halus mengikuti kursor saat hover
// ============================================================

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";

interface MagneticButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "glass" | "outline";
  strength?: number;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  id?: string;
}

export default function MagneticButton({
  children,
  href,
  onClick,
  className = "",
  variant = "primary",
  strength = 0.3,
  type = "button",
  disabled = false,
  id,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics untuk gerakan halus tanpa getaran
  const springX = useSpring(x, { stiffness: 180, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 180, damping: 15, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;

    x.set(distanceX * strength);
    y.set(distanceY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const variantClasses = {
    primary:
      "bg-primary text-[#0F172A] font-semibold hover:bg-primary-hover shadow-lg shadow-primary/20 border border-primary/40",
    secondary:
      "bg-surface text-foreground font-medium hover:bg-surface-hover border border-border shadow-sm",
    glass:
      "bg-surface/80 backdrop-blur-md text-foreground font-medium hover:bg-surface border border-white/10 hover:border-primary/40 shadow-md",
    outline:
      "bg-transparent text-foreground font-medium border border-border hover:border-primary hover:text-primary",
  };

  const isResponsiveFull =
    className.includes("w-full") && className.includes("sm:w-auto");
  const isFullWidth = className.includes("w-full") && !isResponsiveFull;

  const wrapperClass = isResponsiveFull
    ? "block w-full sm:inline-block sm:w-auto"
    : isFullWidth
    ? "block w-full"
    : "inline-block";

  const innerClass = isResponsiveFull
    ? "flex w-full sm:inline-flex sm:w-auto"
    : isFullWidth
    ? "flex w-full"
    : "inline-flex";

  const content = (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      className={`${wrapperClass} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`relative ${innerClass} items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm transition-colors duration-200 select-none overflow-hidden ${variantClasses[variant]} ${className}`}
      >
        {/* Subtle shine highlight */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shine_1.5s_ease-in-out] pointer-events-none" />
        {children}
      </div>
    </motion.div>
  );

  if (href && !disabled) {
    return (
      <Link id={id} href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${wrapperClass} bg-transparent p-0 border-0 outline-none`}
    >
      {content}
    </button>
  );
}
