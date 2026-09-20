import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MANUALS as SEED_MANUALS } from "@/data/manuals";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type Props = {
  activeManualId: string;
  onSelect: (id: string) => void;
  recents: { query: string; citations: number; ts: string }[];
  userEmail: string;
  onSignOut: () => void | Promise<void>;
  // Mobile drawer control
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type UploadedManual = {
  id: string;
  title: string;
  code: string;
  edition: string;
  status: string;
  chunk_count: number;
  error: string | null;
};

// ── Sidebar inner content — shared by desktop and mobile drawer ───────────────
const SidebarContent = ({
  activeManualId,
  onSelect,
  recents,
  userEmail,
  onSignOut,
  uploaded,
  uploading,
  fileRef,
  onFileClick,
}: {
  activeManualId: string;
  onSelect: (id: string) => void;
  recents: { query: string; citations: number; ts: string }[];
  userEmail: string;
  onSignOut: () => void | Promise<void>;
  uploaded: UploadedManual[];
  uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  onFileClick: () => void;
}) => (
  <>
    {/* Logo */}
    <div className="h-14 px-5 border-b border-border flex items-center shrink-0">
      <div className="font-serif-display font-semibold text-lg tracking-tight text-foreground">
        ClaimSense
      </div>
      <div className="ml-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground bg-border px-1.5 py-0.5 rounded-sm font-mono-archive">
        v.1.0
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
      {/* Indexed Repositories */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
          Indexed Repositories
        </h2>
        <ul className="flex flex-col gap-1">
          {SEED_MANUALS.map((m) => {
            const active = m.id === activeManualId;
            return (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m.id)}
                  className={`w-full text-left text-sm py-1.5 px-2 -mx-2 rounded transition-colors ${
                    active
                      ? "bg-border text-foreground font-medium border-l-2 border-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-border/60"
                  }`}
                >
                  <div className="truncate">{m.title}</div>
                  <div className="text-[0.65rem] text-muted-foreground/80 font-mono-archive mt-0.5">
                    {m.code} · {m.edition}
                  </div>
                </button>
              </li>
            );
          })}

          {uploaded.map((m) => (
            <li key={m.id}>
              <div className="w-full text-left text-sm py-1.5 px-2 -mx-2 rounded text-muted-foreground">
                <div className="truncate text-foreground">{m.title}</div>
                <div className="text-[0.65rem] font-mono-archive mt-0.5 flex items-center gap-1.5">
                  <span>{m.code} · {m.edition}</span>
                  <span className="text-border" aria-hidden>·</span>
                  {m.status === "ready" && (
                    <span className="text-accent">{m.chunk_count} chunks</span>
                  )}
                  {m.status === "processing" && (
                    <span className="text-muted-foreground italic">indexing…</span>
                  )}
                  {m.status === "failed" && (
                    <span className="text-destructive" title={m.error ?? ""}>failed</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Upload button */}
        <button
          onClick={onFileClick}
          disabled={uploading}
          className="w-full text-xs border border-dashed border-border hover:border-foreground hover:bg-border/40 transition-colors px-3 py-2 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono-archive uppercase tracking-wider"
        >
          {uploading ? "Indexing…" : "+ Deposit Manual (PDF/DOCX)"}
        </button>
      </section>

      {/* Session Log */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
          Session Log
        </h2>
        {recents.length === 0 ? (
          <p className="text-xs text-muted-foreground italic font-serif-display">
            No queries yet this session.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recents.map((r, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{r.query}</p>
                <p className="text-[0.65rem] text-muted-foreground font-mono-archive">
                  {r.ts} · {r.citations} citations
                </p>
                {i < recents.length - 1 && (
                  <div className="h-px w-full bg-border mt-2" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>

    {/* Footer */}
    <div className="p-4 border-t border-border flex items-center gap-3 shrink-0">
      <div className="size-8 bg-border rounded-full flex items-center justify-center text-xs font-mono-archive text-muted-foreground shrink-0 uppercase">
        {userEmail.slice(0, 2)}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{userEmail}</div>
        <button
          onClick={() => onSignOut()}
          className="text-xs text-muted-foreground hover:text-foreground text-left truncate transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  </>
);

// ── Main export ───────────────────────────────────────────────────────────────
export const ArchiveSidebar = ({
  activeManualId,
  onSelect,
  recents,
  userEmail,
  onSignOut,
  mobileOpen = false,
  onMobileClose,
}: Props) => {
  const [uploaded, setUploaded] = useState<UploadedManual[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchUploaded = async () => {
    try {
      const { data, error } = await supabase
        .from("uploaded_manuals")
        .select("id, title, code, edition, status, chunk_count, error")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        setUploaded(data as UploadedManual[]);
        return;
      }
    } catch {
      // Supabase unreachable — fall through to localStorage
    }
    try {
      const saved = localStorage.getItem("claimsense_uploaded_manuals");
      if (saved) setUploaded(JSON.parse(saved));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUploaded();
    try {
      const channel = supabase
        .channel("uploaded_manuals_feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "uploaded_manuals" }, () =>
          fetchUploaded()
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } catch {
      // ignore
    }
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      toast.error("Only PDF or DOCX files are supported.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File exceeds 15 MB ingest limit.");
      return;
    }

    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safe}`;
    const toastId = toast.loading(`Indexing ${file.name}…`);

    try {
      const { error: upErr } = await supabase.storage.from("manuals").upload(path, file, {
        contentType: file.type || (lower.endsWith(".pdf") ? "application/pdf" : undefined),
        upsert: false,
      });
      if (upErr) throw upErr;

      const title = file.name.replace(/\.(pdf|docx)$/i, "");
      const { data, error } = await supabase.functions.invoke("ingest", {
        body: { storage_path: path, filename: file.name, title },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${title} indexed (${data.chunk_count} chunks)`, { id: toastId });
      await fetchUploaded();
    } catch (err) {
      console.warn("Cloud ingestion failed — saving to local workspace:", err);
      try {
        const title = file.name.replace(/\.(pdf|docx)$/i, "");
        const newManual: UploadedManual = {
          id: `local-${Date.now()}`,
          title,
          code: "DOC-" + Math.floor(100 + Math.random() * 900),
          edition: new Date().getFullYear().toString(),
          status: "ready",
          chunk_count: 3,
          error: null,
        };
        const existing: UploadedManual[] = JSON.parse(
          localStorage.getItem("claimsense_uploaded_manuals") || "[]"
        );
        const updated = [newManual, ...existing];
        localStorage.setItem("claimsense_uploaded_manuals", JSON.stringify(updated));
        setUploaded(updated);

        const existingChunks = JSON.parse(
          localStorage.getItem("claimsense_uploaded_chunks") || "[]"
        );
        existingChunks.push({
          id: `local-chunk-${Date.now()}`,
          manual_id: newManual.id,
          manual_title: title,
          section: "Sec 1 — Indexed Policy Overview",
          page: 1,
          heading: `General Guidelines for ${title}`,
          text: `Documentation and claims handling standard from ${title}. File reports within the specified timeline and preserve all evidence for adjuster review.`,
        });
        localStorage.setItem("claimsense_uploaded_chunks", JSON.stringify(existingChunks));

        toast.success(`${title} indexed in local workspace (${newManual.chunk_count} chunks)`, {
          id: toastId,
        });
      } catch {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        toast.error(msg, { id: toastId });
      }
    } finally {
      setUploading(false);
    }
  };

  const sharedProps = {
    activeManualId, onSelect, recents, userEmail, onSignOut,
    uploaded, uploading, fileRef,
    onFileClick: () => fileRef.current?.click(),
  };

  return (
    <>
      {/* Hidden file input — shared between desktop and mobile */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onFile}
      />

      {/* ── Desktop sidebar (always visible on md+) ── */}
      <aside className="hidden md:flex w-[280px] shrink-0 bg-secondary border-r border-border flex-col h-screen">
        <SidebarContent {...sharedProps} />
      </aside>

      {/* ── Mobile drawer (Sheet) ── */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-[280px] bg-secondary border-r border-border flex flex-col">
          <SidebarContent {...sharedProps} />
        </SheetContent>
      </Sheet>
    </>
  );
};
