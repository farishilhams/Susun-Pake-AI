"use client";

// ============================================================
// components/ui/model-selector.tsx — Rich Dropdown Model Selector
//
// Dropdown pemilih model AI bergaya Cinematic Glass dengan metadata lengkap:
// nama model, badge status, deskripsi kemampuan, checkmark aktif,
// pengelompokan kategori performa, dan toggle "Penalaran yang diperluas".
// Sesuai UI-UX standards & DESIGN.md
// ============================================================

import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AI_MODELS,
  getModelById,
  getDefaultModel,
  CATEGORY_LABELS,
} from "@/modules/ai-provider/catalog";
import { AICategory, AIModelDefinition } from "@/modules/ai-provider/types";
import { Check, ChevronDown, Sparkles, Brain, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelSelectorProps {
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
  extendedReasoning?: boolean;
  onToggleExtendedReasoning?: (enabled: boolean) => void;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModelId,
  onSelectModel,
  extendedReasoning = false,
  onToggleExtendedReasoning,
  className,
  triggerClassName,
  align = "end",
  side = "bottom",
  sideOffset = 6,
  disabled = false,
}: ModelSelectorProps) {
  const activeModel =
    (selectedModelId ? getModelById(selectedModelId) : undefined) ??
    getDefaultModel();

  const categories: AICategory[] = ["fast", "general", "reasoning"];

  // Helper untuk rendering badge warna yang harmonis
  const getBadgeStyle = (badgeText: string) => {
    switch (badgeText.toLowerCase()) {
      case "baru":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "rekomendasi":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "kilat":
      case "cepat":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "canggih":
      case "reasoning":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "coding":
        return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
      case "free":
      default:
        return "bg-slate-700/50 text-slate-300 border border-slate-600/40";
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              "group relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
              "bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-slate-200 hover:border-slate-500 hover:bg-slate-800/90 shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              triggerClassName
            )}
            title={`Model AI Aktif: ${activeModel.name}${
              extendedReasoning ? " (Penalaran Diperluas)" : ""
            }`}
          >
            {activeModel.category === "reasoning" || extendedReasoning ? (
              <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
            ) : activeModel.category === "fast" ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}

            <span className="font-semibold tracking-tight text-slate-100 flex items-center gap-1.5">
              <span>{activeModel.name}</span>
              {extendedReasoning && (
                <span className="text-[10px] text-purple-400 font-normal">
                  + Mendalam
                </span>
              )}
            </span>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={12}
          className="w-[310px] sm:w-[350px] max-w-[95vw] max-h-[min(520px,var(--radix-dropdown-menu-content-available-height,82vh))] flex flex-col rounded-2xl border border-slate-800 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 text-slate-200 font-sans"
        >
          {/* Header Info (Pinned / Sticky Top) */}
          <div className="shrink-0 px-3 py-2 border-b border-slate-800/80 flex items-center justify-between select-none">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
              KATALOG MODEL AI
            </span>
            <span className="text-[10px] text-emerald-400/90 font-medium font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Fallback Dinamis Aktif
            </span>
          </div>

          {/* Area Daftar Model yang Bisa di-Scroll Atas-Bawah */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-1 pr-1 custom-model-scrollbar"
            style={{
              maxHeight: "340px",
              touchAction: "pan-y",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148, 163, 184, 0.4) transparent",
            }}
            onWheel={(e) => {
              // Memastikan wheel event menggulir daftar internal tanpa terblokir
              e.stopPropagation();
            }}
          >
            {categories.map((category, idx) => {
              const models = AI_MODELS.filter((m) => m.category === category);
              if (models.length === 0) return null;

              return (
                <div key={category} className="py-1">
                  <DropdownMenuLabel className="px-3 py-1 text-[11px] font-bold text-slate-400 tracking-wide select-none">
                    {CATEGORY_LABELS[category]}
                  </DropdownMenuLabel>

                  {models.map((model: AIModelDefinition) => {
                    const isSelected = activeModel.id === model.id;

                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onSelect={() => onSelectModel(model.id)}
                        className={cn(
                          "flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer font-sans my-0.5",
                          isSelected
                            ? "bg-slate-800/80 text-white shadow-sm"
                            : "hover:bg-slate-900/90 text-slate-300 hover:text-white"
                        )}
                      >
                        {/* Checkmark Indicator */}
                        <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
                          {isSelected ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-semibold text-xs text-slate-100 truncate">
                              {model.name}
                            </span>
                            {model.badge && (
                              <span
                                className={cn(
                                  "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                                  getBadgeStyle(model.badge)
                                )}
                              >
                                {model.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                            {model.description}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}

                  {idx < categories.length - 1 && (
                    <DropdownMenuSeparator className="my-1 bg-slate-800/60" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Opsi Penalaran yang Diperluas (Pinned / Sticky Bottom) */}
          {onToggleExtendedReasoning && (
            <div className="shrink-0 border-t border-slate-800/80 mt-1 pt-1">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleExtendedReasoning(!extendedReasoning);
                }}
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-sans",
                  extendedReasoning
                    ? "bg-purple-950/40 border border-purple-500/30 text-purple-200"
                    : "hover:bg-slate-900/90 text-slate-300 hover:text-white border border-transparent"
                )}
              >
                <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
                  {extendedReasoning ? (
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded border border-slate-700 block" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                      <span>Penalaran yang diperluas</span>
                      <Brain className="w-3 h-3 text-purple-400 shrink-0" />
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300">
                      R1 / Thinking
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Pemecahan masalah kompleks &amp; verifikasi relasi arsitektur
                  </p>
                </div>
              </DropdownMenuItem>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ModelSelector;
