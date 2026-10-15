"use client";

// ============================================================
// components/editor/MarkdownPreview.tsx — Live Markdown Preview
// Menggunakan react-markdown + remark-gfm (GitHub Flavored Markdown)
// Styled sesuai MASTER.md: IBM Plex Sans body, JetBrains Mono code
// Lazy-loaded via next/dynamic di ProjectEditor
// ============================================================

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import MermaidDiagram from "./MermaidDiagram";

const components: Components = {
  // Heading: JetBrains Mono, green accent untuk H1
  h1: ({ children }) => (
    <h1
      className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 mt-5 sm:mt-6 pb-2 border-b border-border tracking-tight break-words"
      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="text-base sm:text-lg font-bold mb-2.5 sm:mb-3 mt-5 sm:mt-6 pb-1 border-b border-border tracking-tight break-words"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="text-sm sm:text-base font-semibold mb-2 mt-4 break-words"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      className="text-xs sm:text-sm font-semibold mb-1.5 mt-3 text-muted-fg break-words"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </h4>
  ),

  // Paragraf
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-xs sm:text-sm text-foreground break-words">{children}</p>
  ),

  // List
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 list-disc pl-4 sm:pl-5 text-xs sm:text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1 list-decimal pl-4 sm:pl-5 text-xs sm:text-sm">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-xs sm:text-sm leading-relaxed text-foreground break-words">{children}</li>
  ),

  // Code inline & blocks
  code: ({ children, className }) => {
    const isMermaid = className?.includes("language-mermaid");
    if (isMermaid) {
      const chartCode = Array.isArray(children)
        ? children.join("")
        : typeof children === "string"
        ? children
        : String(children ?? "");
      return <MermaidDiagram chart={chartCode} />;
    }

    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code
          className="block bg-muted/80 rounded-lg p-3 sm:p-4 text-[11px] sm:text-xs overflow-x-auto whitespace-pre leading-relaxed"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-[11px] sm:text-xs text-primary font-mono break-all sm:break-normal"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {children}
      </code>
    );
  },

  // Code block wrapper (jangan double-wrap diagram mermaid)
  pre: ({ children }) => {
    const child = React.Children.toArray(children)[0];
    if (
      React.isValidElement(child) &&
      typeof child.props === "object" &&
      child.props !== null &&
      "className" in child.props &&
      typeof (child.props as { className?: unknown }).className === "string" &&
      ((child.props as { className: string }).className.includes("language-mermaid"))
    ) {
      return <>{children}</>;
    }

    return (
      <pre className="mb-3.5 bg-muted/80 rounded-xl overflow-hidden border border-border">
        {children}
      </pre>
    );
  },

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 sm:border-l-4 border-primary/50 pl-3 sm:pl-4 my-3 italic text-muted-fg text-xs sm:text-sm">
      {children}
    </blockquote>
  ),

  // Table (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-border bg-surface/40 shadow-sm">
      <table className="min-w-full text-xs sm:text-sm border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/80">{children}</thead>
  ),
  th: ({ children }) => (
    <th
      className="px-3 py-2 text-left text-[11px] sm:text-xs font-semibold text-foreground border-b border-border whitespace-nowrap"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-xs sm:text-sm text-foreground border-b border-border/40">
      {children}
    </td>
  ),

  // HR
  hr: () => <hr className="my-5 sm:my-6 border-border" />,

  // Strong / Em
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-fg">{children}</em>
  ),

  // Checkbox list (GFM task lists)
  input: ({ type, checked, disabled }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          disabled={disabled}
          className="mr-2 accent-primary rounded cursor-default"
        />
      );
    }
    return null;
  },
};

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg text-xs sm:text-sm py-16 px-4">
        <div className="text-center">
          <p className="text-3xl mb-2">👁️</p>
          <p>Preview dokumentasi akan muncul di sini</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3.5 sm:p-6 max-w-none text-foreground break-words"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
