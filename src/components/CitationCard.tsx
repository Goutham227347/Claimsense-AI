import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export type Citation = {
  id: string;
  manual: string;
  section: string;
  page: number;
  heading: string;
  excerpt: string;
};

export const CitationCard = ({ c, index }: { c: Citation; index: number }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`[${c.manual} · ${c.section} · p.${c.page}]\n${c.excerpt}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked in some contexts
    }
  };

  return (
    <article className="group bg-card border border-border rounded shadow-sm hover:border-muted-foreground transition-colors overflow-hidden">
      {/* Header row */}
      <div className="flex justify-between items-start p-3 gap-2">
        <span className="text-[0.65rem] font-mono-archive text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm leading-tight">
          [#{index + 1}] {c.section}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[0.6rem] text-muted-foreground font-mono-archive">
            Pg. {c.page}
          </span>
          <button
            onClick={handleCopy}
            title="Copy excerpt"
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          >
            {copied
              ? <Check size={11} className="text-accent" />
              : <Copy size={11} />
            }
          </button>
        </div>
      </div>

      {/* Heading + manual */}
      <div className="px-3 pb-2">
        <h3 className="font-serif-display text-sm text-foreground leading-tight mb-0.5">
          {c.heading}
        </h3>
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-mono-archive">
          {c.manual}
        </p>
      </div>

      {/* Excerpt — expandable */}
      <div className="border-t border-border/60">
        <p
          className={`text-xs text-muted-foreground leading-relaxed px-3 pt-2 pb-1 transition-all ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          "{c.excerpt}"
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[0.6rem] font-mono-archive text-muted-foreground hover:text-foreground px-3 pb-2 pt-0.5 transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={10} /> Collapse</>
          ) : (
            <><ChevronDown size={10} /> Show full passage</>
          )}
        </button>
      </div>
    </article>
  );
};
