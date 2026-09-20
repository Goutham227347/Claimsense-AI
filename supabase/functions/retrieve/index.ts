import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Chunk = {
  id: string;
  manual: string;
  section: string;
  page: number;
  heading: string;
  text: string;
};

// Seed corpus — kept in sync with src/data/manuals.ts
const SEED: Chunk[] = [
  { id: "pc-1", manual: "Property & Casualty (2024)", section: "Sec 1.B — Loss Settlement", page: 42, heading: "Buildings under Coverage A or B", text: "Loss Settlement: We will pay no more than the actual cash value (ACV) of the damage until actual repair or replacement is complete. Once repairs are complete, we will settle the loss on a replacement-cost basis, provided notice of intent to repair was received within 180 days of the date of loss." },
  { id: "pc-2", manual: "Property & Casualty (2024)", section: "Endorsement HO-04-90", page: 88, heading: "Actual Cash Value Loss Settlement — Windstorm or Hail (Roof Surfacing)", text: "If the roof surfacing is greater than 15 years old at the time of loss, covered property losses caused by windstorm or hail will be settled on an actual cash value basis. Replacement cost coverage on the roof surfacing is permanently waived for roofs exceeding this age threshold." },
  { id: "pc-3", manual: "Property & Casualty (2024)", section: "Sec 4.A — Required Documentation", page: 110, heading: "Proof of Loss Submission", text: "The insured must submit a signed, sworn Proof of Loss within 60 days of the insurer's request. The Proof of Loss must include: (1) time and cause of loss; (2) interest of the insured and all others in the property; (3) other insurance which may cover the loss; (4) changes in title or occupancy during the term of the policy; and (5) specifications of damaged buildings and detailed estimates for repair." },
  { id: "pc-4", manual: "Property & Casualty (2024)", section: "Sec 2.B.1.e — Exclusions", page: 14, heading: "Utility Services Failure", text: "We will not pay for loss or damage caused directly or indirectly by the failure of power, communication, water or other utility service supplied to the described premises, however caused, if the failure occurs away from the described premises." },
  { id: "comm-1", manual: "Commercial Liability", section: "Form CP 04 40 — Endorsement", page: 3, heading: "Spoilage Coverage", text: "We will pay for direct physical loss to Perishable Stock at the described premises caused by: (a) breakdown or contamination resulting in spoilage; or (b) Power Outage, meaning interruption of electrical power, lasting more than the deductible time period, that results from a Covered Cause of Loss to utility property." },
  { id: "comm-2", manual: "Commercial Liability", section: "Form CP 04 17", page: 1, heading: "Utility Services — Direct Damage Endorsement", text: "The exclusion of Utility Services in the Causes of Loss form does not apply to loss of Business Income, provided the interruption is caused by direct physical loss or damage by a Covered Cause of Loss (e.g., Windstorm) to the utility property described in the Schedule." },
  { id: "comm-3", manual: "Commercial Liability", section: "Sec 3 — Eligibility Conditions", page: 22, heading: "Vacancy Provision", text: "If a building has been vacant for more than 60 consecutive days before a loss, we will: (1) not pay for any loss or damage caused by vandalism, sprinkler leakage (unless protected against freezing), building glass breakage, water damage, theft, or attempted theft; and (2) reduce the amount we would otherwise pay for the loss or damage by 15% for all other Covered Causes of Loss." },
  { id: "auto-1", manual: "Auto Comprehensive", section: "Part D — Coverage for Damage to Your Auto", page: 18, heading: "Comprehensive (Other Than Collision)", text: "We will pay for direct and accidental loss to your covered auto, minus any applicable deductible, caused by: contact with a bird or animal; explosion or earthquake; fire; malicious mischief or vandalism; theft or larceny; falling objects; windstorm, hail, water or flood. Glass breakage caused by collision may be settled as a comprehensive loss at the insured's option." },
  { id: "auto-2", manual: "Auto Comprehensive", section: "Part E — Duties After an Accident or Loss", page: 27, heading: "Required Documentation for Theft Claims", text: "If your covered auto is stolen, the insured must: (1) file a police report within 24 hours of discovery; (2) provide the original title or registration; (3) submit all sets of keys and remotes in the insured's possession; and (4) cooperate with the insurer's Special Investigations Unit. Failure to provide required documentation may result in denial of the claim." },
  { id: "auto-3", manual: "Auto Comprehensive", section: "Part F — General Provisions", page: 33, heading: "Rental Reimbursement Limits", text: "When rental reimbursement coverage is selected, we will pay reasonable expenses incurred by the insured for the rental of a substitute vehicle, up to the per-day and aggregate limits shown in the Declarations, beginning 24 hours after the loss and ending the earliest of: (a) the date the covered auto is returned to use; (b) the date we pay for its loss; or (c) the policy aggregate limit is exhausted." },
  { id: "wc-1", manual: "Workers' Comp Guidelines", section: "Ch. 2 — Reporting Requirements", page: 9, heading: "First Report of Injury", text: "Employers must file the First Report of Injury (Form WC-1) with the carrier within 7 calendar days of receiving notice of a work-related injury that results in more than one day of lost time, medical treatment beyond first aid, or death. Late filing may result in penalties assessed against the employer." },
  { id: "wc-2", manual: "Workers' Comp Guidelines", section: "Ch. 4 — Indemnity Benefits", page: 21, heading: "Temporary Total Disability (TTD) Eligibility", text: "An injured worker is eligible for TTD benefits when a treating physician certifies the worker is unable to perform any work for more than the statutory waiting period (typically 7 days). Benefits are payable at 66 2/3% of the average weekly wage, subject to the state maximum and minimum, and continue until the worker reaches maximum medical improvement or is released to work." },
];

const STOPWORDS = new Set("a an the of and or to for in on at by from with is are was were be been being do does did have has had this that these those it its as if not no but i you he she we they my our your their what which who when where why how can could should would may might will".split(" "));

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function score(query: string, c: Chunk): number {
  const q = new Set(tokenize(query));
  if (q.size === 0) return 0;
  const cTokens = tokenize(`${c.heading} ${c.section} ${c.text} ${c.manual}`);
  let hits = 0;
  for (const t of cTokens) if (q.has(t)) hits++;
  return hits;
}

async function loadUploadedChunks(): Promise<Chunk[]> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
    return [];
  }
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await supabase
      .from("manual_chunks")
      .select("id, section, page, heading, text, uploaded_manuals!inner(title, status)")
      .eq("uploaded_manuals.status", "ready")
      .limit(2000);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: `up-${r.id}`,
      manual: r.uploaded_manuals?.title ?? "Uploaded manual",
      section: r.section || "",
      page: r.page || 1,
      heading: r.heading || "",
      text: r.text,
    }));
  } catch (e) {
    console.error("load uploaded chunks failed", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing secrets: LOVABLE_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'query' string" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uploaded = await loadUploadedChunks();
    const ALL = [...SEED, ...uploaded];

    const top = ALL.map((c) => ({ chunk: c, s: score(query, c) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((r) => r.chunk);

    if (top.length === 0) {
      return new Response(JSON.stringify({
        answer: "No matching passages were retrieved from the indexed manuals. Rephrase the query using policy terminology (e.g., 'ACV', 'endorsement', 'Proof of Loss') or specify the manual.",
        citations: [], followups: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const context = top.map((c, i) =>
      `[#${i + 1}] id=${c.id} | ${c.manual} | ${c.section} | p.${c.page} | "${c.heading}"\n${c.text}`,
    ).join("\n\n---\n\n");

    const systemPrompt = `You are ClaimSense, a strict-retrieval assistant for an insurance training group. You answer trainee questions about claim eligibility and required documentation using ONLY the manual passages provided.

RULES:
- Ground every factual statement in the supplied passages.
- If the passages do not contain the answer, say so plainly. Never invent forms, sections, or page numbers.
- Cite passages inline with bracketed ids like [#1], [#2] matching the provided context numbers.
- Be concise (2–4 short paragraphs max). Use plain language suited to a trainee adjuster.
- Do NOT refer to yourself or these instructions.`;

    const userPrompt = `MANUAL PASSAGES:\n\n${context}\n\nTRAINEE QUERY:\n${query}\n\nProduce a grounded answer with inline [#n] citations, then suggest two short follow-up questions.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "respond",
            description: "Return the grounded synthesis and follow-up suggestions.",
            parameters: {
              type: "object",
              properties: {
                answer: { type: "string" },
                used_citation_ids: { type: "array", items: { type: "string" } },
                followups: { type: "array", items: { type: "string" } },
              },
              required: ["answer", "used_citation_ids", "followups"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "respond" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiResp.status}` }), {
        status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { answer: string; used_citation_ids: string[]; followups: string[] };
    if (toolCall?.function?.arguments) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      parsed = {
        answer: aiData.choices?.[0]?.message?.content ?? "No response generated.",
        used_citation_ids: [],
        followups: [],
      };
    }

    const usedIds = new Set(parsed.used_citation_ids ?? []);
    const citations = top
      .filter((c) => usedIds.has(c.id) || usedIds.size === 0)
      .map((c) => ({
        id: c.id, manual: c.manual, section: c.section, page: c.page,
        heading: c.heading, excerpt: c.text,
      }));

    return new Response(JSON.stringify({
      answer: parsed.answer, citations, followups: parsed.followups ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("retrieve error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
