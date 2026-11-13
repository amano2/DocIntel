import React from 'react';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

/**
 * Parses inline markdown: **bold**, `code`, and clean badge accents
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by bold (**...**) and code (`...`)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      const isRedFlag = boldText.includes('Flagged') || boldText.includes('Defect') || boldText.includes('Exceeds');
      const isClean = boldText.includes('Reconciled') || boldText.includes('Clean') || boldText.includes('Signed');
      
      parts.push(
        <strong
          key={match.index}
          className={`font-bold ${
            isRedFlag ? 'text-red-400' : isClean ? 'text-emerald-400' : 'text-foreground'
          }`}
        >
          {boldText}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 mx-0.5 bg-muted/80 text-primary border border-border/80 font-mono text-[11px] inline-block font-semibold"
        >
          {codeText}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-mono break-words">{content}</div>;
  }

  // Parse into blocks (headings, tables, callouts, paragraphs, bullet points)
  const lines = (content || '').split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table Detection (Line starts and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].includes('-')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        
        // tableLines[1] is the separator (| :--- | :--- |)
        const bodyLines = tableLines.slice(2);

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--color-primary)]">
            <table className="w-full text-left font-mono text-xs border-collapse min-w-[580px]">
              <thead className="bg-muted/90 text-foreground border-b-2 border-border font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 sm:p-2.5 border-r border-border/40 last:border-r-0 whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                {bodyLines.map((bLine, rIdx) => {
                  const cells = bLine
                    .slice(1, -1)
                    .split('|')
                    .map((c) => c.trim());
                  return (
                    <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                      {cells.map((cell, cIdx) => {
                        const isDefectCell = cell.includes('Flagged') || cell.includes('Defect') || cell.includes('Exceeds');
                        const isReconciledCell = cell.includes('Reconciled') || cell.includes('Clean') || cell.includes('Signed');
                        return (
                          <td
                            key={cIdx}
                            className={`p-2 sm:p-2.5 border-r border-border/30 last:border-r-0 whitespace-nowrap text-foreground ${
                              isDefectCell
                                ? 'bg-red-500/10 text-red-300 font-semibold'
                                : isReconciledCell
                                ? 'text-emerald-400'
                                : ''
                            }`}
                          >
                            {renderInline(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (### or ## or #)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4
          key={`heading-${i}`}
          className="font-heading font-bold text-sm sm:text-base text-primary tracking-wider uppercase mt-3 mb-1.5 flex items-center gap-1.5 border-b border-border/50 pb-1"
        >
          {renderInline(headingText)}
        </h4>
      );
      i++;
      continue;
    }

    // 3. Blockquotes / Alerts (> ...)
    if (trimmed.startsWith('> ')) {
      const alertText = trimmed.slice(2).trim();
      elements.push(
        <div
          key={`alert-${i}`}
          className="my-2.5 p-2.5 sm:p-3 border-l-4 border-amber-500 bg-amber-500/10 text-amber-200 text-xs font-mono leading-relaxed"
        >
          {renderInline(alertText)}
        </div>
      );
      i++;
      continue;
    }

    // 4. Bullet Items (• or - )
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      const itemText = trimmed.replace(/^[•\-]\s*/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm pl-1 font-mono leading-relaxed">
          <span className="text-primary mt-0.5 shrink-0 font-bold">•</span>
          <span className="text-foreground/90">{renderInline(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 5. Blank lines
    if (trimmed === '') {
      elements.push(<div key={`blank-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 6. Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 text-xs sm:text-sm font-mono leading-relaxed text-foreground/90">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5 max-w-full overflow-hidden">{elements}</div>;
}
