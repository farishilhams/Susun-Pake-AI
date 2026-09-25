"use client";

// ============================================================
// components/editor/MermaidDiagram.tsx — Client-Side Mermaid Renderer
// Sesuai ARCHITECTURE.md § 4.2 & DESIGN.md § 5.1
// Mendukung rendering diagram visual (ERD, sequence, flowchart)
// Tahan terhadap SSE streaming (tidak me-render token parsial)
// ============================================================

import React, { useEffect, useState, useId, useTransition } from "react";
import { Check, Copy, Code, Eye, RefreshCw } from "lucide-react";

interface MermaidDiagramProps {
  chart: string;
}

let mermaidInitialized = false;

async function getMermaid() {
  const mermaidModule = await import("mermaid");
  const mermaid = mermaidModule.default;

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        darkMode: true,
        background: "#1B2336",
        mainBkg: "#1B2336",
        primaryColor: "#1B2336",
        primaryBorderColor: "#22C55E",
        primaryTextColor: "#F8FAFC",
        lineColor: "#22C55E",
        secondaryColor: "#272F42",
        tertiaryColor: "#0F172A",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "13px",
      },
      er: {
        useMaxWidth: true,
        fill: "#1B2336",
        stroke: "#334155",
      },
    });
    mermaidInitialized = true;
  }

  return mermaid;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const reactId = useId().replace(/:/g, "_");
  const uniqueId = `mermaid_${reactId}`;

  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const cleanChart = chart.trim();

  useEffect(() => {
    let isCancelled = false;

    // Deteksi jika diagram masih belum lengkap (misal saat streaming SSE)
    if (!cleanChart || cleanChart.length < 5) {
      setIsParsing(true);
      return;
    }

    const renderChart = async () => {
      try {
        const mermaid = await getMermaid();
        if (isCancelled) return;

        // Validasi sintaks sebelum render untuk mencegah crash saat streaming
        const isValid = await mermaid.parse(cleanChart).catch(() => false);
        if (!isValid) {
          if (!isCancelled) {
            setIsParsing(true);
            setError("Diagram sedang diproses atau sintaks belum lengkap...");
          }
          return;
        }

        // Render SVG
        const renderResult = await mermaid.render(`${uniqueId}_svg`, cleanChart);
        if (isCancelled) return;

        startTransition(() => {
          setSvgHtml(renderResult.svg);
          setError(null);
          setIsParsing(false);
        });
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn("Mermaid render error (likely partial streaming):", err);
          setIsParsing(false);
          setError("Diagram belum lengkap atau memiliki sintaks tidak valid.");
        }
      }
    };

    renderChart();

    return () => {
      isCancelled = true;
    };
  }, [cleanChart, uniqueId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanChart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Top bar toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono font-semibold text-foreground tracking-wide">
            Diagram ERD / Visual
          </span>
          {isParsing && (
            <span className="text-muted-fg text-[11px] flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-primary" />
              Rendering...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-border hover:border-primary/40 text-muted-fg hover:text-foreground transition-colors"
            title={showCode ? "Tampilkan Diagram Visual" : "Tampilkan Kode Mermaid"}
          >
            {showCode ? (
              <>
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code className="w-3.5 h-3.5" />
                <span>Kode</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-border hover:border-primary/40 text-muted-fg hover:text-foreground transition-colors"
            title="Salin Kode Mermaid"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">Disalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 overflow-x-auto min-h-[140px] flex items-center justify-center">
        {showCode ? (
          <pre
            className="w-full text-xs text-foreground bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre font-mono leading-relaxed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {cleanChart}
          </pre>
        ) : svgHtml ? (
          <div
            className="mermaid-svg-container w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : error ? (
          <div className="text-center py-6 px-4">
            <p className="text-xs text-muted-fg mb-3">{error}</p>
            <pre
              className="text-left max-w-xl mx-auto text-xs text-muted-fg bg-muted/60 p-3 rounded border border-border/50 font-mono whitespace-pre overflow-x-auto"
            >
              {cleanChart}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-fg gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-mono">Memuat diagram visual...</span>
          </div>
        )}
      </div>
    </div>
  );
}
