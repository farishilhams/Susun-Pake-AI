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
    <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-border" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold mb-3 mt-6 pb-1 border-b border-border" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mb-2 mt-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mb-2 mt-3 text-muted-fg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </h4>
  ),

  // Paragraf
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-sm text-foreground">{children}</p>
  ),

  // List
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 list-disc pl-5 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1 list-decimal pl-5 text-sm">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground">{children}</li>
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
          className="block bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-xs text-primary"
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
      <pre className="mb-3 bg-muted rounded-lg overflow-hidden border border-border">
        {children}
      </pre>
    );
  },

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-3 italic text-muted-fg text-sm">
      {children}
    </blockquote>
  ),

  // Table (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-foreground border-b border-border"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-foreground border-b border-border/50">
      {children}
    </td>
  ),

  // HR
  hr: () => <hr className="my-6 border-border" />,

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
          className="mr-2 accent-primary"
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
      <div className="flex items-center justify-center h-full text-muted-fg text-sm py-16">
        <div className="text-center">
          <p className="text-3xl mb-2">👁️</p>
          <p>Preview akan muncul di sini</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-5 max-w-none text-foreground"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
