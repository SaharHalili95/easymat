'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { examPdfUrl } from '@/lib/examUrl';

interface BagrutQuestion {
  text: string;
  year: string;
  moed: string;
  shalon: string;
  source: string;
}

interface Props {
  role: 'user' | 'assistant';
  content: string;
  bagrutQuestion?: BagrutQuestion;
}

function looksLikeLatex(s: string): boolean {
  return /[\\_{^}]/.test(s);
}

// Split a markdown text segment into LaTeX and plain parts, render each correctly
function renderSegment(text: string) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      try {
        return <BlockMath key={i} math={part.slice(2, -2)} />;
      } catch {
        return <code key={i} className="text-red-500">{part}</code>;
      }
    }
    if (part.startsWith('$') && part.endsWith('$') && looksLikeLatex(part.slice(1, -1))) {
      try {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      } catch {
        return <code key={i} className="text-red-500">{part}</code>;
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessage({ role, content, bagrutQuestion }: Props) {
  const isUser = role === 'user';
  const [bqOpen, setBqOpen] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
        dir="auto"
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <div className="mb-2 last:mb-0">{renderSegmentChildren(children)}</div>,
              h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{renderSegmentChildren(children)}</li>,
              pre: ({ children }) => <pre className="bg-gray-200 rounded p-2 text-xs font-mono overflow-x-auto my-2">{children}</pre>,
              code: ({ children, className }) =>
                className
                  ? <code className={className}>{children}</code>
                  : <code className="bg-gray-200 rounded px-1 text-xs font-mono">{children}</code>,
              hr: () => <hr className="my-2 border-gray-300" />,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-400 pl-3 italic text-gray-600 my-1">{children}</blockquote>,
              table: ({ children }) => <table className="border-collapse text-xs my-2 w-full">{children}</table>,
              th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-semibold">{children}</th>,
              td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{renderSegmentChildren(children)}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}

        {!isUser && bagrutQuestion && (
          <div className="mt-3 border-t border-gray-200 pt-2">
            <button
              onClick={() => setBqOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <span>{bqOpen ? '▲' : '▼'}</span>
              שאלה מבגרות אמיתית לדוגמה
            </button>
            {bqOpen && (
              <div className="mt-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-700">
                    בגרות {bagrutQuestion.year} מועד {bagrutQuestion.moed} — שאלון {bagrutQuestion.shalon}
                  </span>
                  <a
                    href={examPdfUrl(bagrutQuestion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 text-[10px] underline"
                  >
                    © משרד החינוך
                  </a>
                </div>
                <p dir="rtl" className="leading-relaxed whitespace-pre-wrap">{bagrutQuestion.text.slice(0, 600)}{bagrutQuestion.text.length > 600 ? '...' : ''}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Render children that may contain LaTeX strings inside markdown nodes
function renderSegmentChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return renderSegment(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string'
        ? <span key={i}>{renderSegment(child)}</span>
        : child
    );
  }
  return children;
}
