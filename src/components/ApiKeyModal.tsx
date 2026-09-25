import { useState, useEffect } from "react";
import { Key, Sparkles, Check, AlertCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getGeminiApiKey, setGeminiApiKey } from "@/utils/retrieval";
import { toast } from "sonner";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
}

export function ApiKeyModal({ open, onOpenChange, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (open) {
      const current = getGeminiApiKey();
      setApiKey(current);
      setStatus("idle");
      setStatusMsg("");
    }
  }, [open]);

  const handleTestKey = async (keyToTest: string) => {
    const trimmed = keyToTest.trim();
    if (!trimmed) {
      toast.error("Please enter an API key first.");
      return;
    }

    setTesting(true);
    setStatus("idle");
    setStatusMsg("");

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${trimmed}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello, reply with OK." }] }],
          }),
        }
      );

      const data = await resp.json().catch(() => null);

      if (resp.ok && data?.candidates?.[0]?.content) {
        setStatus("valid");
        setStatusMsg("API key is valid and working!");
        toast.success("Gemini API key verified successfully!");
      } else {
        setStatus("invalid");
        const msg = data?.error?.message || "Invalid API key or permission denied.";
        setStatusMsg(msg);
        toast.error(`Verification failed: ${msg}`);
      }
    } catch (err) {
      setStatus("invalid");
      const msg = err instanceof Error ? err.message : "Network error testing key";
      setStatusMsg(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    setGeminiApiKey(trimmed);
    if (trimmed) {
      toast.success("Gemini API key saved!");
    } else {
      toast.info("Gemini API key cleared. Using local retrieval mode.");
    }
    onKeySaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-md bg-accent/10 text-accent">
              <Sparkles size={18} />
            </div>
            <DialogTitle className="font-serif-display text-lg">
              Gemini AI Integration
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Connect your Google Gemini API key to enable live reasoning and synthesis across your policy manuals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.65rem] text-accent hover:underline flex items-center gap-1 font-normal"
              >
                Get free key at Google AI Studio <ExternalLink size={10} />
              </a>
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setStatus("idle");
                }}
                placeholder="AIzaSy..."
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 pr-10 outline-none focus:border-foreground font-mono-archive text-xs placeholder:text-muted-foreground/60"
              />
              <Key
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                status === "valid"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {status === "valid" ? (
                <Check size={14} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
              )}
              <span className="leading-snug break-words">{statusMsg}</span>
            </div>
          )}

          <div className="bg-secondary/40 border border-border/60 rounded-md p-3 text-[0.7rem] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">Why add an API key?</div>
            <p>
              With Gemini connected, you can ask arbitrary policy questions in plain English. The model reads the indexed passages and crafts answers with inline citations.
            </p>
            <p className="text-[0.65rem] text-muted-foreground/80 pt-1">
              Your key is saved locally in your browser storage and never sent to any third-party server.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            onClick={() => handleTestKey(apiKey)}
            disabled={testing || !apiKey.trim()}
            className="text-xs border border-border bg-background hover:bg-secondary px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test Key"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setApiKey("");
                setGeminiApiKey("");
                setStatus("idle");
                setStatusMsg("");
                toast.info("API key cleared");
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs bg-foreground text-background hover:bg-accent px-4 py-1.5 rounded-md font-medium transition-colors"
            >
              Save Key
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
