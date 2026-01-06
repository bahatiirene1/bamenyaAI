'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Terminal } from 'lucide-react';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Copy button component
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="
        absolute top-2 right-2
        p-2 rounded-lg
        bg-white/10 hover:bg-white/20
        text-gray-300 hover:text-white
        transition-all duration-200
        opacity-0 group-hover:opacity-100
      "
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Code blocks with syntax highlighting
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !codeString.includes('\n');

            if (isInline) {
              return (
                <code
                  className="
                    px-1.5 py-0.5 mx-0.5
                    rounded-md
                    bg-[var(--muted)]
                    text-[var(--rw-blue)]
                    font-mono text-sm
                  "
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="group relative my-4 rounded-xl overflow-hidden border border-[var(--border)]">
                {/* Header */}
                <div className="
                  flex items-center justify-between
                  px-4 py-2
                  bg-[#1e1e1e] border-b border-[var(--border)]
                ">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Terminal size={12} />
                    <span>{language || 'code'}</span>
                  </div>
                  <CopyButton code={codeString} />
                </div>

                {/* Code */}
                <SyntaxHighlighter
                  style={oneDark}
                  language={language || 'text'}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: '#1e1e1e',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'var(--font-mono), ui-monospace, monospace',
                    },
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-[var(--muted)]">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-3 text-left font-semibold border-b border-[var(--border)]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-3 border-b border-[var(--border)]">
                {children}
              </td>
            );
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--rw-blue)] hover:underline"
              >
                {children}
              </a>
            );
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="
                my-4 pl-4 py-2
                border-l-4 border-[var(--rw-blue)]
                bg-[var(--rw-blue)]/5
                rounded-r-lg
                italic
              ">
                {children}
              </blockquote>
            );
          },

          // Lists
          ul({ children }) {
            return <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4 rw-gradient-text">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>;
          },

          // Paragraphs
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>;
          },

          // Horizontal rule
          hr() {
            return <hr className="my-6 border-[var(--border)]" />;
          },

          // Images
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="my-4 rounded-xl max-w-full h-auto border border-[var(--border)]"
                loading="lazy"
              />
            );
          },

          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>;
          },

          // Emphasis/Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Elegant streaming cursor */}
      {isStreaming && (
        <span className="streaming-cursor" />
      )}
    </div>
  );
}
