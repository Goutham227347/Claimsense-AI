import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { Sun, Moon, Trash2, Menu, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockAuth } from "@/utils/auth";
import { localRetrieve, getGeminiApiKey } from "@/utils/retrieval";
import { toast } from "sonner";
import { ArchiveSidebar } from "@/components/ArchiveSidebar";
import { ConversationTurn, ChatTurn } from "@/components/ConversationTurn";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { MANUALS } from "@/data/manuals";

const STARTER_PROMPTS = [
  "Is depreciation applied to roof replacement under HO-3, and what is the maximum roof age?",
  "What documentation is required to file a stolen-vehicle comprehensive claim?",
  "When does business income coverage apply during an off-premises power failure?",
  "What is the deadline to file a First Report of Injury for workers' comp?",
];

const MAX_CHARS = 800;

const Index = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [activeManual, setActiveManual] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHasApiKey(!!getGeminiApiKey());
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mockSession = mockAuth.getMockSession();
    if (mockSession) {
      setSession(mockSession as Session);
      setAuthReady(true);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (!data.session && !mockSession) navigate("/auth", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // ── Auto-scroll feed ──────────────────────────────────────────────────────
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

  const activeManualTitle =
    MANUALS.find((m) => m.id === activeManual)?.title ?? "All Repositories";

  // ── Submit query ─────────────────────────────────────────────────────────
  const submitQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || submitting) return;
    if (trimmed.length > MAX_CHARS) {
      toast.error(`Query exceeds ${MAX_CHARS} character limit.`);
      return;
    }
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSubmitting(true);

    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, { id, query: trimmed, loading: true }]);

    try {
      let data: { answer?: string; citations?: any[]; followups?: string[]; error?: string } | null = null;

      // Try local/direct Gemini retrieval first if API key is configured
      const directKey = getGeminiApiKey();
      if (directKey) {
        data = await localRetrieve(trimmed, activeManual);
      } else {
        // Try remote Supabase Edge Function first
        try {
          const res = await supabase.functions.invoke("retrieve", {
            body: { query: trimmed },
          });
          if (!res.error && res.data && !res.data.error) {
            data = res.data;
          }
        } catch (remoteErr) {
          console.warn("Supabase edge function unavailable, falling back to local RAG:", remoteErr);
        }

        // Fallback: local retrieval engine
        if (!data) {
          data = await localRetrieve(trimmed, activeManual);
        }
      }

      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                loading: false,
                answer: data?.answer ?? "",
                citations: data?.citations ?? [],
                followups: data?.followups ?? [],
              }
            : t
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Retrieval failed.";
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, loading: false, error: msg } : t))
      );
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const clearConversation = () => {
    setTurns([]);
    toast.success("Conversation cleared.");
  };

  const recents = turns
    .filter((t) => !t.loading && !t.error)
    .slice(-4)
    .reverse()
    .map((t, i) => ({
      query: t.query,
      citations: t.citations?.length ?? 0,
      ts: i === 0 ? "Just now" : `${i * 2 + 1}m ago`,
    }));

  const lastTurn = turns[turns.length - 1];
  const followups = lastTurn?.followups ?? [];
  const charsLeft = MAX_CHARS - input.length;

  if (!authReady || !session) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <ArchiveSidebar
        activeManualId={activeManual}
        onSelect={(id) => { setActiveManual(id); setSidebarOpen(false); }}
        recents={recents}
        userEmail={session.user.email ?? "You"}
        onSignOut={async () => {
          mockAuth.clearMockSession();
          await supabase.auth.signOut();
        }}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main panel */}
      <main className="flex-1 flex flex-col h-full bg-card relative min-w-0">
        {/* Header */}
        <header className="h-14 px-4 md:px-8 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10 shrink-0 gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {/* Active context label */}
          <div className="text-sm text-muted-foreground font-medium truncate flex-1">
            Active Context:{" "}
            <span className="text-foreground">{activeManualTitle}</span>
          </div>

          {/* Right-side controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Gemini API Key Configuration */}
            <button
              onClick={() => setKeyModalOpen(true)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                hasApiKey
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title="Configure Gemini AI Key"
            >
              <Sparkles size={13} className={hasApiKey ? "text-emerald-500" : ""} />
              <span className="font-mono-archive text-[0.65rem] tracking-wider uppercase font-medium">
                {hasApiKey ? "Gemini AI: Active" : "Connect AI"}
              </span>
            </button>

            <div className="text-[0.65rem] text-muted-foreground border border-border px-2 py-1 rounded-sm font-mono-archive uppercase tracking-wider hidden sm:block">
              Strict Retrieval Mode
            </div>

            {/* Clear conversation */}
            {turns.length > 0 && (
              <button
                onClick={clearConversation}
                title="Clear conversation"
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-secondary"
                aria-label="Clear conversation"
              >
                <Trash2 size={15} />
              </button>
            )}

            {/* Dark / light mode toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto px-4 md:px-8 pt-10 pb-52 space-y-14">
          <ErrorBoundary>
            {turns.length === 0 ? (
              <div className="max-w-[48rem] mx-auto w-full">
                <div className="text-[0.65rem] uppercase tracking-wider text-accent font-semibold mb-3 font-mono-archive">
                  ClaimSense AI · Personal Workspace
                </div>
                <h1 className="font-serif-display text-4xl text-foreground leading-tight text-balance mb-4">
                  Ask a grounded question against your indexed claim manuals.
                </h1>
                <p className="text-muted-foreground leading-relaxed mb-10 max-w-[40rem]">
                  Use this workspace to review eligibility conditions and documentation requirements.
                  Every answer is synthesised strictly from cited manual passages — no fabrication,
                  no guesswork.
                </p>

                <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  Suggested Inquiries
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {STARTER_PROMPTS.map((p) => (
                    <li key={p}>
                      <button
                        onClick={() => submitQuery(p)}
                        className="w-full text-left text-sm border border-border bg-background hover:border-accent hover:bg-secondary/60 transition-colors p-4 rounded-md font-serif-display leading-snug text-foreground"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              turns.map((t) => <ConversationTurn key={t.id} turn={t} />)
            )}
          </ErrorBoundary>
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card to-transparent pt-12 pb-6 px-4 md:px-8">
          <div className="max-w-[48rem] mx-auto">
            {/* Follow-up chips */}
            {followups.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 items-center">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold py-1 pr-1">
                  Follow up:
                </span>
                {followups.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => submitQuery(f)}
                    className="text-xs bg-background border border-border px-3 py-1.5 rounded-full text-foreground hover:bg-secondary hover:border-accent transition-colors"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={(e) => { e.preventDefault(); submitQuery(input); }}
              className="bg-background border border-border p-1.5 rounded-lg flex items-end shadow-sm focus-within:border-muted-foreground focus-within:shadow-[0_0_0_1px_hsl(var(--foreground)/0.1)] transition-all"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitQuery(input);
                  }
                }}
                rows={1}
                placeholder="Ask your claim question…"
                className="flex-1 p-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground placeholder:italic placeholder:font-serif-display outline-none resize-none max-h-32"
              />
              <div className="flex flex-col items-end gap-1 mb-1.5 mr-1.5 shrink-0">
                <button
                  type="submit"
                  disabled={submitting || !input.trim()}
                  className="bg-foreground text-background h-8 px-4 rounded text-xs font-medium tracking-wide hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Searching…" : "Retrieve"}
                </button>
                {input.length > 0 && (
                  <span
                    className={`text-[0.6rem] font-mono-archive ${
                      charsLeft < 100 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {charsLeft}
                  </span>
                )}
              </div>
            </form>

            <p className="text-center mt-3 text-[0.65rem] text-muted-foreground">
              Retrieves exact manual clauses. Verify against specific state endorsements. ·{" "}
              <kbd className="font-mono-archive bg-secondary border border-border px-1 rounded text-[0.6rem]">Enter</kbd>{" "}
              to submit,{" "}
              <kbd className="font-mono-archive bg-secondary border border-border px-1 rounded text-[0.6rem]">Shift+Enter</kbd>{" "}
              for new line
            </p>
          </div>
        </div>
      </main>

      <ApiKeyModal
        open={keyModalOpen}
        onOpenChange={setKeyModalOpen}
        onKeySaved={() => setHasApiKey(!!getGeminiApiKey())}
      />
    </div>
  );
};

export default Index;
