import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Custom MarkdownRenderer that renders headers, bold text, lists, and code blocks
 * cleanly with semantic HTML and Hirely's typography without raw symbols like ### or **.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-1.5 my-2.5 pl-1">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5DD62C] mt-2 shrink-0 shadow-[0_0_6px_#5DD62C]" />
              <div className="flex-1">{parseInlineStyles(item)}</div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const parseInlineStyles = (text: string): React.ReactNode => {
    // Replace **bold** with <strong>
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Regex for **bold** and `code`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const matchedText = match[0];
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        parts.push(
          <strong key={key++} className="font-semibold text-white tracking-wide">
            {matchedText.slice(2, -2)}
          </strong>
        );
      } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-[#5DD62C] font-mono text-[11px]">
            {matchedText.slice(1, -1)}
          </code>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        parts.push(
          <em key={key++} className="italic text-slate-200">
            {matchedText.slice(1, -1)}
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Header 1: #
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg sm:text-xl font-bold text-white tracking-tight mt-4 mb-2 pb-1 border-b border-white/[0.08]">
          {parseInlineStyles(trimmed.slice(2).trim())}
        </h1>
      );
      continue;
    }

    // Header 2: ##
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-base sm:text-lg font-semibold text-[#5DD62C] tracking-tight mt-3 mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-[#5DD62C] rounded-full inline-block shadow-[0_0_8px_#5DD62C]" />
          {parseInlineStyles(trimmed.slice(3).trim())}
        </h2>
      );
      continue;
    }

    // Header 3: ###
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm sm:text-base font-semibold text-white tracking-tight mt-2.5 mb-1">
          {parseInlineStyles(trimmed.slice(4).trim())}
        </h3>
      );
      continue;
    }

    // Bullet points: * or -
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      currentList.push(trimmed.slice(2).trim());
      continue;
    }

    // Numbered list: 1.
    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const textWithoutNumber = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-xs sm:text-sm text-slate-200">
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-[#5DD62C] font-bold">
            {trimmed.match(/^\d+/)?.[0]}
          </span>
          <div className="flex-1 leading-relaxed">
            {parseInlineStyles(textWithoutNumber)}
          </div>
        </div>
      );
      continue;
    }

    // Standard paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-200 leading-relaxed my-1.5">
        {parseInlineStyles(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1 text-slate-200 select-text">{elements}</div>;
};
