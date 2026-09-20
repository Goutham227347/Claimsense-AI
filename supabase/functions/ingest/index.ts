import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import mammoth from "npm:mammoth@1.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Chunk = {
  ordinal: number;
  section: string;
  page: number;
  heading: string;
  text: string;
};

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return result.value || "";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const SCHEMA_INSTRUCTIONS = `Return a JSON object with a "chunks" array. Each chunk represents a self-contained passage suitable for semantic retrieval (typically 80-220 words). For each chunk include:
- "section": the section/clause label as it appears (e.g. "Sec 4.A — Required Documentation"). If unknown, use "".
- "page": the page number it appears on (integer, best estimate, default 1).
- "heading": a concise human-readable heading describing the passage (max 80 chars).
- "text": the passage text, faithful to the source. Do NOT summarise; preserve clause language.
Aim for 6–25 chunks total. Skip tables of contents, headers/footers, and copyright pages.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_chunks",
    description: "Emit the structured chunk list for the manual.",
    parameters: {
      type: "object",
      properties: {
        chunks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              section: { type: "string" },
              page: { type: "integer" },
              heading: { type: "string" },
              text: { type: "string" },
            },
            required: ["section", "page", "heading", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["chunks"],
      additionalProperties: false,
    },
  },
};

async function chunkWithAI(opts: {
  kind: "pdf" | "docx";
  base64?: string;
  text?: string;
  filename: string;
}): Promise<Chunk[]> {
  const userContent: any[] =
    opts.kind === "pdf" && opts.base64
      ? [
          {
            type: "text",
            text: `Source file: ${opts.filename} (PDF). Extract claim-manual passages.\n\n${SCHEMA_INSTRUCTIONS}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${opts.base64}` },
          },
        ]
      : [
          {
            type: "text",
            text: `Source file: ${opts.filename} (DOCX, raw text below). Extract claim-manual passages.\n\n${SCHEMA_INSTRUCTIONS}\n\n--- BEGIN DOCUMENT ---\n${opts.text}\n--- END DOCUMENT ---`,
          },
        ];

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: userContent }],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "emit_chunks" } },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${body.slice(0, 300)}`);
  }

  const data = await resp.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Model returned no tool call");

  let parsed: any;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("Tool arguments were not valid JSON");
  }

  const raw: Chunk[] = (parsed.chunks ?? [])
    .filter((c: any) => c && typeof c.text === "string" && c.text.trim().length > 30)
    .map((c: any, i: number) => ({
      ordinal: i,
      section: String(c.section ?? "").slice(0, 200),
      page: Number.isFinite(c.page) ? Math.max(1, Math.floor(c.page)) : 1,
      heading: String(c.heading ?? "").slice(0, 200),
      text: String(c.text).trim(),
    }));
  return raw;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_KEY || !LOVABLE_API_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!SERVICE_KEY) missing.push("SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) missing.push("LOVABLE_API_KEY");
    return new Response(JSON.stringify({ error: `Missing secrets: ${missing.join(", ")}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let manualId: string | null = null;

  try {
    const { storage_path, filename, title, code, edition } = await req.json();
    if (!storage_path || !filename) {
      return new Response(JSON.stringify({ error: "storage_path and filename required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("uploaded_manuals")
      .insert({
        title: title || filename,
        code: code || "USR",
        edition: edition || "Uploaded",
        source_filename: filename,
        storage_path,
        status: "processing",
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    manualId = inserted.id;

    try {
      const { data: file, error: dlErr } = await supabase.storage
        .from("manuals")
        .download(storage_path);
      if (dlErr) throw dlErr;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const lower = String(filename).toLowerCase();
      let chunks: Chunk[] = [];

      if (lower.endsWith(".pdf")) {
        if (bytes.length > 15 * 1024 * 1024) {
          throw new Error("PDF exceeds 15MB ingest limit.");
        }
        const b64 = bytesToBase64(bytes);
        chunks = await chunkWithAI({ kind: "pdf", base64: b64, filename });
      } else if (lower.endsWith(".docx")) {
        const text = await extractDocxText(bytes);
        if (!text || text.trim().length < 50) {
          throw new Error("DOCX produced no extractable text.");
        }
        const truncated = text.slice(0, 120_000);
        chunks = await chunkWithAI({ kind: "docx", text: truncated, filename });
      } else {
        throw new Error("Unsupported file type. Upload PDF or DOCX.");
      }

      if (chunks.length === 0) throw new Error("No chunks produced from document.");

      const { error: chunkErr } = await supabase.from("manual_chunks").insert(
        chunks.map((c) => ({
          manual_id: manualId,
          ordinal: c.ordinal,
          section: c.section,
          page: c.page,
          heading: c.heading,
          text: c.text,
        })),
      );
      if (chunkErr) throw chunkErr;

      await supabase
        .from("uploaded_manuals")
        .update({ status: "ready", chunk_count: chunks.length, error: null })
        .eq("id", manualId);

      return new Response(
        JSON.stringify({ manual_id: manualId, chunk_count: chunks.length, status: "ready" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ingest failed";
      if (manualId) {
        await supabase
          .from("uploaded_manuals")
          .update({ status: "failed", error: msg })
          .eq("id", manualId);
      }
      throw e;
    }
  } catch (e) {
    console.error("ingest error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
