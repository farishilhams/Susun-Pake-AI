"use client";

// ============================================================
// components/ui/ConfirmModal.tsx
// Modal Konfirmasi & Notifikasi Interaktif Pengganti window.confirm & alert
// Desain Cinematic Glass, Framer Motion, ramah tema & aksesibilitas
// Sesuai DESIGN.md § 4 (Anti-AI-Slop) & § 6 (Typography & Tokens)
// ============================================================

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Info,
  Trash2,
  RotateCcw,
  Unlink,
  Loader2,
  X,
} from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info" | "rollback" | "unlink";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  isAlert?: boolean; // Jika true, hanya tombol konfirmasi/tutup (pengganti alert)
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
  isAlert = false,
}: ConfirmModalProps) {
  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Ikon & skema warna berdasarkan variant
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 className="w-5 h-5 text-destructive" />,
          iconBg: "bg-destructive/15 border-destructive/25",
          btnColor: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20",
          borderGlow: "border-destructive/30",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          iconBg: "bg-amber-500/15 border-amber-500/25",
          btnColor: "bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-amber-500/20",
          borderGlow: "border-amber-500/30",
        };
      case "rollback":
        return {
          icon: <RotateCcw className="w-5 h-5 text-purple-400" />,
          iconBg: "bg-purple-500/15 border-purple-500/25",
          btnColor: "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-600/20",
          borderGlow: "border-purple-500/30",
        };
      case "unlink":
        return {
          icon: <Unlink className="w-5 h-5 text-rose-400" />,
          iconBg: "bg-rose-500/15 border-rose-500/25",
          btnColor: "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20",
          borderGlow: "border-rose-500/30",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-5 h-5 text-primary" />,
          iconBg: "bg-primary/15 border-primary/25",
          btnColor: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20",
          borderGlow: "border-primary/30",
        };
    }
  };

  const style = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => !isLoading && onClose()}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
            className={`relative w-full max-w-md bg-card/95 border ${style.borderGlow} rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl z-10`}
          >
            {/* Header: Icon + Title on left, Close Button on right */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl border ${style.iconBg} shrink-0 flex items-center justify-center`}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id="confirm-modal-title"
                    className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight"
                  >
                    {title}
                  </h3>
                </div>
              </div>

              {!isLoading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0 -mr-2 cursor-pointer"
                  aria-label="Tutup dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 pt-1">
              {description}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {!isAlert && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-border/60 bg-secondary/40 text-secondary-foreground text-xs sm:text-sm font-semibold hover:bg-secondary/80 transition-all disabled:opacity-50"
                >
                  {cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (onConfirm) {
                    await onConfirm();
                  } else {
                    onClose();
                  }
                }}
                disabled={isLoading}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 ${style.btnColor}`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
