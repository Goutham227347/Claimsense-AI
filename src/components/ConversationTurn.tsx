import { Citation, CitationCard } from "./CitationCard";

export type ChatTurn = {
  id: string;
  query: string;
  answer?: string;
  citations?: Citation[];
  followups?: string[];
  loading?: boolean;
  error?: string;
};

// ── Skeleton placeholder ─────────────────────────────────────────────────────
const AnswerSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
    {/* Answer skeleton */}
    <div className="lg:col-span-8 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="size-2 bg-accent/30 rounded-full" />
        <div className="h-2.5 w-28 skeleton-shimmer rounded" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 skeleton-shimmer rounded w-full" />
        <div className="h-3 skeleton-shimmer rounded w-[92%]" />
        <div className="h-3 skeleton-shimmer rounded w-[85%]" />
        <div className="h-3 skeleton-shimmer rounded w-[78%]" />
        <div className="h-3 skeleton-shimmer rounded w-full mt-2" />
        <div className="h-3 skeleton-shimmer rounded w-[88%]" />
        <div className="h-3 skeleton-shimmer rounded w-[60%]" />
      </div>
    </div>
    {/* Citations skeleton */}
    <div className="lg:col-span-4 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-8">
      <div className="h-2 w-20 skeleton-shimmer rounded mb-1" />
      {[0, 1].map((i) => (
        <div key={i} className="border border-border rounded p-3 flex flex-col gap-2">
          <div className="h-2 skeleton-shimmer rounded w-3/4" />
          <div className="h-3 skeleton-shimmer rounded w-full" />
          <div className="h-2 skeleton-shimmer rounded w-1/2" />
          <div className="h-2 skeleton-shimmer rounded w-full mt-1" />
          <div className="h-2 skeleton-shimmer rounded w-[85%]" />
        </div>
      ))}
    </div>
  </div>
);

// ── Render answer with bold markdown + [#n] citation badges ─────────────────
function renderAnswer(answer: string) {
  // Split on bold markdown (**text**) and citation refs ([#n])
  const parts = answer.split(/(\*\*[^*]+\*\*|\[#\d+\])/g);
  return parts.map((p, i) => {
    const citMatch = p.match(/^\[#(\d+)\]$/);
    if (citMatch) {
      return (
        <sup
          key={i}
          className="ml-0.5 inline-flex items-center justify-center text-[0.6rem] font-mono-archive text-accent bg-accent/10 border border-accent/20 px-1 py-0.5 rounded-sm align-super"
        >
          {citMatch[1]}
        </sup>
      );
    }
    const boldMatch = p.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

// ── Main component ───────────────────────────────────────────────────────────
export const ConversationTurn = ({ turn }: { turn: ChatTurn }) => {
  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* User Query */}
      <div className="max-w-[48rem] mx-auto w-full">
        <div className="flex items-baseline gap-4">
          <div className="w-6 text-right text-muted-foreground font-serif-display italic text-lg shrink-0">
            Q.
          </div>
          <h2 className="text-xl font-serif-display text-foreground leading-snug text-balance">
            {turn.query}
          </h2>
        </div>
      </div>

      {/* Response block */}
      <div className="max-w-[64rem] mx-auto w-full bg-background border border-border p-6 rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        {turn.loading ? (
          <AnswerSkeleton />
        ) : turn.error ? (
          <div className="text-sm text-destructive font-medium">{turn.error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Synthesis */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 bg-accent rounded-full" />
                <span className="text-xs uppercase tracking-wider text-accent font-semibold">
                  Grounded Synthesis
                </span>
              </div>
              <div className="text-[0.95rem] text-foreground leading-relaxed whitespace-pre-wrap">
                {turn.answer ? renderAnswer(turn.answer) : null}
              </div>
            </div>

            {/* Citations */}
            <div className="lg:col-span-4 flex flex-col gap-3 lg:border-l lg:border-border lg:pl-8">
              <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Sourced Material ({turn.citations?.length ?? 0})
              </div>
              {turn.citations?.length ? (
                turn.citations.map((c, i) => (
                  <CitationCard key={c.id} c={c} index={i} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic font-serif-display">
                  No matching passages were retrieved.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
