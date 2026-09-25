"use client";

// ============================================================
// components/project/NewProjectForm.tsx — Form Wizard Input Awal
// 4 field: nama project, tipe app, fitur utama, preferensi stack
// Submit → POST /api/projects → redirect ke interview
// Sesuai PRD.md § 3 (nama project, tipe app, fitur utama, stack)
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

type FormStep = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  projectType: string;
  mainFeatures: string;
  techStackPreference: string;
}

const PROJECT_TYPES = [
  { value: "web-app", label: "Web App", icon: "🌐" },
  { value: "mobile-app", label: "Mobile App", icon: "📱" },
  { value: "api-service", label: "API / Backend Service", icon: "⚙️" },
  { value: "saas", label: "SaaS / Platform", icon: "🚀" },
  { value: "cli-tool", label: "CLI Tool", icon: "💻" },
  { value: "library", label: "Library / Package", icon: "📦" },
  { value: "game", label: "Game", icon: "🎮" },
  { value: "other", label: "Lainnya", icon: "✨" },
];

const STEPS: Array<{ step: FormStep; label: string }> = [
  { step: 1, label: "Nama Project" },
  { step: 2, label: "Tipe Aplikasi" },
  { step: 3, label: "Fitur Utama" },
  { step: 4, label: "Tech Stack" },
];

export default function NewProjectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    projectType: "",
    mainFeatures: "",
    techStackPreference: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const nextStep = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      setError("Nama project tidak boleh kosong");
      return;
    }
    if (currentStep === 2 && !formData.projectType) {
      setError("Pilih tipe aplikasi terlebih dahulu");
      return;
    }
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as FormStep);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as FormStep);
  };

  const handleSubmit = async () => {
    if (!formData.mainFeatures.trim()) {
      setError("Deskripsikan fitur utama project kamu");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.message ?? "Gagal membuat project, coba lagi");
          return;
        }

        // Redirect ke halaman interview dengan projectId
        router.push(`/project/${json.data.id}/interview`);
      } catch {
        setError("Koneksi gagal, periksa jaringan kamu");
      }
    });
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        {STEPS.map(({ step, label }) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step < currentStep
                  ? "bg-primary text-white"
                  : step === currentStep
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-muted text-muted-fg"
                }
              `}
            >
              {step < currentStep ? "✓" : step}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                step === currentStep ? "text-foreground font-medium" : "text-muted-fg"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Form content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Apa nama project kamu?
              </label>
              <input
                id="project-name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nextStep()}
                placeholder="misal: TaskFlow, EduPlatform, InventoryPro..."
                autoFocus
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-lg"
              />
              <p className="mt-2 text-xs text-muted-fg">
                Gunakan nama yang deskriptif dan mudah diingat
              </p>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium text-foreground mb-4">
                Tipe aplikasi apa yang akan kamu bangun?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PROJECT_TYPES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    id={`project-type-${value}`}
                    type="button"
                    onClick={() => {
                      updateField("projectType", value);
                      setCurrentStep(3);
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all
                      ${
                        formData.projectType === value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-surface-hover"
                      }
                    `}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <label
                htmlFor="main-features"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Fitur utama apa yang kepikiran?
              </label>
              <textarea
                id="main-features"
                value={formData.mainFeatures}
                onChange={(e) => updateField("mainFeatures", e.target.value)}
                placeholder="misal: user bisa membuat task, assign ke anggota tim, set deadline, notifikasi email, dashboard progress..."
                autoFocus
                rows={5}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
              />
              <p className="mt-2 text-xs text-muted-fg">
                Tulis sebebas mungkin — AI akan membantu merapikannya
              </p>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <label
                htmlFor="tech-stack"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Ada preferensi tech stack? (opsional)
              </label>
              <input
                id="tech-stack"
                type="text"
                value={formData.techStackPreference}
                onChange={(e) => updateField("techStackPreference", e.target.value)}
                placeholder="misal: Next.js, PostgreSQL, Prisma, TypeScript... (boleh kosong)"
                autoFocus
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground text-base sm:text-sm placeholder:text-muted-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <p className="mt-2 text-xs text-muted-fg">
                Biarkan kosong jika ingin AI merekomendasikan stack yang sesuai
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            id="prev-step-btn"
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-muted-fg hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          {currentStep < 4 && currentStep !== 2 && (
            <button
              id="next-step-btn"
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              <span>Lanjut</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              id="submit-project-btn"
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Membuat project...
                </>
              ) : (
                <>
                  <span>Mulai Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
