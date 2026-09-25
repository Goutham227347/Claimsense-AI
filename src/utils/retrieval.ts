import { CHUNKS, ManualChunk } from "@/data/manuals";

// ─── API Key Management ──────────────────────────────────────────────────────
export const GEMINI_STORAGE_KEY = "claimsense_gemini_api_key";

export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    const fromStorage = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (fromStorage && fromStorage.trim().length > 0) {
      return fromStorage.trim();
    }
  }
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return "";
}

export function setGeminiApiKey(key: string) {
  if (typeof window !== "undefined") {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  }
}

// ─── Stopwords ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set(
  "a an the of and or to for in on at by from with is are was were be been being do does did have has had this that these those it its as if not no but i you he she we they my our your their what which who when where why how can could should would may might will tell me about explain".split(
    " "
  )
);

// Common insurance synonyms mapping for smarter keyword expansion
const SYNONYMS: Record<string, string[]> = {
  car: ["auto", "vehicle"],
  cars: ["auto", "vehicle"],
  automobile: ["auto", "vehicle"],
  automobiles: ["auto", "vehicle"],
  truck: ["auto", "vehicle"],
  stole: ["stolen", "theft", "larceny"],
  stolen: ["theft", "larceny", "auto"],
  theft: ["stolen", "larceny"],
  robbery: ["theft", "stolen"],
  robbed: ["theft", "stolen"],
  storm: ["windstorm", "hail"],
  hurricane: ["windstorm", "hail"],
  tornado: ["windstorm"],
  rain: ["water", "flood"],
  leak: ["water", "sprinkler"],
  fire: ["flame", "peril"],
  injury: ["injured", "worker", "ttd", "disability", "medical"],
  injured: ["injury", "worker", "ttd", "disability"],
  hurt: ["injury", "disability", "medical"],
  empty: ["vacant", "vacancy"],
  unoccupied: ["vacant", "vacancy"],
  blackout: ["power", "utility", "outage"],
  electricity: ["power", "utility"],
  form: ["report", "proof", "endorsement", "wc-1"],
  paperwork: ["documentation", "proof", "report"],
  papers: ["documentation", "proof"],
};

// ─── Tokeniser ──────────────────────────────────────────────────────────────
export function tokenize(s: string): string[] {
  const words = s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  const expanded: string[] = [];
  for (const w of words) {
    expanded.push(w);
    if (SYNONYMS[w]) {
      expanded.push(...SYNONYMS[w]);
    }
  }
  return Array.from(new Set(expanded));
}

// ─── TF-IDF-style scoring with field boosts ──────────────────────────────────
export function score(query: string, c: ManualChunk): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const qSet = new Set(qTokens);

  let hits = 0;

  // High-weight: heading + section (exact topic match)
  const headingTokens = tokenize(`${c.heading} ${c.section}`);
  for (const t of headingTokens) {
    if (qSet.has(t)) hits += 3.5;
  }

  // Standard-weight: manual title (domain match)
  const titleTokens = tokenize(c.manual_title);
  for (const t of titleTokens) {
    if (qSet.has(t)) hits += 1.5;
  }

  // Low-weight: body text (content match)
  const bodyTokens = tokenize(c.text);
  for (const t of bodyTokens) {
    if (qSet.has(t)) hits += 1;
  }

  // Bonus: unique query token coverage
  const allChunkTokens = new Set([...headingTokens, ...titleTokens, ...bodyTokens]);
  let matchedUnique = 0;
  for (const qt of qTokens) {
    if (allChunkTokens.has(qt)) matchedUnique++;
  }
  hits += matchedUnique * 1.5;

  return hits;
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface RetrievalCitation {
  id: string;
  manual: string;
  section: string;
  page: number;
  heading: string;
  excerpt: string;
}

export interface RetrievalResult {
  answer: string;
  citations: RetrievalCitation[];
  followups: string[];
}

// ─── Load any locally-stored uploaded chunks ─────────────────────────────────
function loadLocalChunks(): ManualChunk[] {
  try {
    const saved = localStorage.getItem("claimsense_uploaded_chunks");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// ─── Gemini API Integration ──────────────────────────────────────────────────
async function callGeminiAI(
  query: string,
  chunks: ManualChunk[],
  apiKey: string
): Promise<{ answer: string; followups: string[] } | null> {
  if (!apiKey) return null;

  const context = chunks
    .map(
      (c, i) =>
        `[#${i + 1}] ID: ${c.id}\nManual: ${c.manual_title}\nSection: ${c.section} (Page ${c.page})\nHeading: "${c.heading}"\nText: ${c.text}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are ClaimSense AI, a rigorous policy retrieval assistant for claim handlers and insurance trainees.
Answer the user's question accurately and strictly based on the provided manual passages.

RULES:
1. Ground your answer in the supplied manual passages. Every key fact must cite its source passage inline with [#1], [#2], etc. matching the context passage numbers.
2. If the passages do not contain enough info, state clearly what the manual says and note any missing details. Do not invent facts or form numbers.
3. Be professional, clear, and well structured. Use bold headings or numbered lists where helpful.
4. At the very end of your response, provide exactly 2 helpful follow-up questions in this format:
FOLLOW_UPS:
- [Follow-up question 1]
- [Follow-up question 2]`;

  const userContent = `AVAILABLE MANUAL PASSAGES:\n\n${context}\n\nUSER QUESTION:\n${query}`;

  const modelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
  ];

  for (const model of modelsToTry) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n${userContent}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null);
        console.warn(`Gemini (${model}) returned status ${resp.status}:`, errJson);
        continue;
      }

      const data = await resp.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) continue;

      let answer = textOutput.trim();
      const followups: string[] = [];

      const parts = answer.split(/FOLLOW_UPS:/i);
      if (parts.length > 1) {
        answer = parts[0].trim();
        const rawFollowUps = parts[1].split("\n");
        for (const line of rawFollowUps) {
          const clean = line.replace(/^[\s*•\-\d.)]+/, "").trim();
          if (clean.length > 4) {
            followups.push(clean);
          }
        }
      }

      return {
        answer,
        followups: followups.slice(0, 3),
      };
    } catch (e) {
      console.warn(`Failed calling Gemini (${model}):`, e);
    }
  }

  return null;
}

// ─── Main entry point ────────────────────────────────────────────────────────
export async function localRetrieve(
  query: string,
  activeManualId?: string
): Promise<RetrievalResult> {
  const allChunks = [...CHUNKS, ...loadLocalChunks()];

  // Filter by active manual (if one is specifically selected)
  let candidates = allChunks;
  if (activeManualId && activeManualId !== "all") {
    const filtered = allChunks.filter((c) => c.manual_id === activeManualId);
    if (filtered.length > 0) candidates = filtered;
  }

  // Score & rank candidates
  let ranked = candidates
    .map((c) => ({ chunk: c, s: score(query, c) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);

  // If filtering narrowed down too much, fallback to all chunks
  if (ranked.length === 0 && candidates !== allChunks) {
    ranked = allChunks
      .map((c) => ({ chunk: c, s: score(query, c) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
  }

  // If still no direct keyword hits, take representative chunks so AI can still synthesize
  let topChunks = ranked.slice(0, 4).map((r) => r.chunk);
  if (topChunks.length === 0) {
    topChunks = (candidates.length > 0 ? candidates : allChunks).slice(0, 3);
  }

  const citations: RetrievalCitation[] = topChunks.map((c) => ({
    id: c.id,
    manual: c.manual_title,
    section: c.section,
    page: c.page,
    heading: c.heading,
    excerpt: c.text,
  }));

  // 1. Try Gemini API first if configured
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    const geminiResult = await callGeminiAI(query, topChunks, apiKey);
    if (geminiResult && geminiResult.answer) {
      return {
        answer: geminiResult.answer,
        citations,
        followups:
          geminiResult.followups.length > 0
            ? geminiResult.followups
            : ["What documentation is required?", "Does this apply to other perils?"],
      };
    }
  }

  // 2. Fallback: Local rule-based synthesis
  const synthesis = synthesize(query, topChunks);
  return { answer: synthesis.answer, citations, followups: synthesis.followups };
}

// ─── Grounded synthesis ───────────────────────────────────────────────────────
function citeIdx(chunks: ManualChunk[], id: string, fallback = 1): string {
  const i = chunks.findIndex((c) => c.id === id);
  return `[#${i >= 0 ? i + 1 : fallback}]`;
}

function synthesize(
  query: string,
  chunks: ManualChunk[]
): { answer: string; followups: string[] } {
  const q = query.toLowerCase();

  // ── Roof / HO-3 / depreciation / windstorm ────────────────────────────────
  if (
    q.includes("roof") ||
    q.includes("depreciation") ||
    q.includes("windstorm") ||
    q.includes("hail") ||
    q.includes("ho-3")
  ) {
    const c1 = citeIdx(chunks, "pc-2");
    const c2 = citeIdx(chunks, "pc-1", 2);
    return {
      answer:
        `Under Endorsement HO-04-90, if the roof surfacing is greater than **15 years old** at the time of ` +
        `loss, covered property losses caused by windstorm or hail are settled strictly on an actual cash value ` +
        `(ACV) basis ${c1}. Replacement cost coverage on the roof surfacing is permanently waived once this ` +
        `threshold is exceeded ${c1}.\n\n` +
        `For buildings under Coverage A or B, the insurer pays no more than ACV until repair or replacement is ` +
        `verified complete. Replacement-cost settlement then applies, provided the insured submitted notice of ` +
        `intent to repair within **180 days** of the date of loss ${c2}.`,
      followups: [
        "What must the insured submit within 180 days to trigger replacement-cost settlement?",
        "What five items must a Proof of Loss include?",
      ],
    };
  }

  // ── Auto theft / stolen vehicle / car damage ──────────────────────────────
  if (
    q.includes("stolen") ||
    q.includes("theft") ||
    q.includes("larceny") ||
    q.includes("vehicle") ||
    q.includes("auto") ||
    q.includes("car")
  ) {
    const c1 = citeIdx(chunks, "auto-2");
    const c2 = citeIdx(chunks, "auto-1", 2);
    const c3 = citeIdx(chunks, "auto-3", 3);
    return {
      answer:
        `To file a stolen-vehicle comprehensive claim under Part E, the insured must satisfy four mandatory ` +
        `documentation requirements ${c1}:\n\n` +
        `1. File a **police report within 24 hours** of discovery.\n` +
        `2. Provide the **original title or registration**.\n` +
        `3. Submit **all sets of keys and remotes** in the insured's possession.\n` +
        `4. **Cooperate fully** with the insurer's Special Investigations Unit (SIU).\n\n` +
        `Theft or larceny is a covered peril under Part D (Comprehensive), subject to the applicable deductible ` +
        `${c2}. Where rental reimbursement coverage is selected, expenses begin **24 hours after the loss** ` +
        `and continue until the vehicle is returned, the loss is paid, or the aggregate limit is exhausted ${c3}.`,
      followups: [
        "When exactly does rental reimbursement coverage end after a theft?",
        "What other perils are covered under Comprehensive (Other Than Collision)?",
      ],
    };
  }

  // ── Power failure / utility / business income ──────────────────────────────
  if (
    q.includes("power") ||
    q.includes("utility") ||
    q.includes("business income") ||
    q.includes("spoilage") ||
    q.includes("outage")
  ) {
    const c1 = citeIdx(chunks, "comm-2");
    const c2 = citeIdx(chunks, "comm-1", 2);
    const c3 = citeIdx(chunks, "pc-4", 3);
    return {
      answer:
        `By default, property policy exclusions bar coverage for losses caused by off-premises utility ` +
        `service failure ${c3}.\n\n` +
        `However, with **Form CP 04 17 (Utility Services — Direct Damage Endorsement)**, business income ` +
        `coverage activates when the power interruption is caused by **direct physical damage from a Covered ` +
        `Cause of Loss** (e.g., windstorm) to the scheduled utility property ${c1}.\n\n` +
        `For perishable stock, **Form CP 04 40** provides spoilage coverage for power outages that exceed the ` +
        `policy deductible time period ${c2}.`,
      followups: [
        "What is the vacancy provision and how long must a building be vacant for it to apply?",
        "What documentation is needed to trigger the Utility Services endorsement?",
      ],
    };
  }

  // ── Workers' comp / injury / TTD / first report ───────────────────────────
  if (
    q.includes("injury") ||
    q.includes("worker") ||
    q.includes("comp") ||
    q.includes("ttd") ||
    q.includes("disability") ||
    q.includes("first report") ||
    q.includes("wc-1")
  ) {
    const c1 = citeIdx(chunks, "wc-1");
    const c2 = citeIdx(chunks, "wc-2", 2);
    return {
      answer:
        `Employers must file **Form WC-1 (First Report of Injury)** with the carrier within **7 calendar days** ` +
        `of receiving notice of a work-related injury that results in: more than one day of lost time, medical ` +
        `treatment beyond first aid, or death ${c1}. Late filing may trigger administrative penalties against ` +
        `the employer ${c1}.\n\n` +
        `An injured worker becomes eligible for **Temporary Total Disability (TTD)** indemnity benefits when a ` +
        `treating physician certifies inability to perform any work beyond the statutory waiting period ` +
        `(typically 7 days). Benefits are paid at **66⅔% of the average weekly wage**, subject to state maximums ` +
        `and minimums, and continue until maximum medical improvement or release to work ${c2}.`,
      followups: [
        "What is the statutory waiting period before TTD benefits become payable?",
        "What penalties apply to an employer for late filing of Form WC-1?",
      ],
    };
  }

  // ── Proof of Loss / documentation / settlement ────────────────────────────
  if (
    q.includes("proof of loss") ||
    q.includes("documentation") ||
    q.includes("settlement") ||
    q.includes("acs") ||
    q.includes("acv")
  ) {
    const c1 = citeIdx(chunks, "pc-3");
    const c2 = citeIdx(chunks, "pc-1", 2);
    return {
      answer:
        `Under Section 4.A, the insured must submit a signed, sworn **Proof of Loss within 60 days** of the ` +
        `insurer's request ${c1}. The filing must include:\n\n` +
        `1. Time and cause of loss\n` +
        `2. The insured's interest and all others' interests in the property\n` +
        `3. Other insurance that may cover the loss\n` +
        `4. Changes in title or occupancy during the policy term\n` +
        `5. Specifications of damaged buildings and detailed repair estimates ${c1}\n\n` +
        `Settlement proceeds initially on an **actual cash value (ACV)** basis and converts to ` +
        `**replacement-cost** once verified repair completion and timely notice are established ${c2}.`,
      followups: [
        "What is the 180-day notice rule for replacement-cost settlement under Coverage A?",
        "When does the roof ACV rule apply under HO-04-90?",
      ],
    };
  }

  // ── Vacancy / commercial ──────────────────────────────────────────────────
  if (q.includes("vacanc") || q.includes("vacant") || q.includes("commercial")) {
    const c1 = citeIdx(chunks, "comm-3");
    return {
      answer:
        `Under the **Vacancy Provision** (Section 3 — Eligibility Conditions), if a building has been vacant ` +
        `for more than **60 consecutive days** before a loss, the insurer will ${c1}:\n\n` +
        `1. **Exclude** losses caused by: vandalism, sprinkler leakage (unless protected against freezing), ` +
        `building glass breakage, water damage, theft, or attempted theft.\n` +
        `2. **Reduce** the payment by **15%** for all other Covered Causes of Loss.`,
      followups: [
        "Does the 60-day vacancy rule apply to the spoilage endorsement?",
        "How does the Utility Services endorsement interact with the vacancy provision?",
      ],
    };
  }

  // ── Generic grounded synthesis with inline citations ─────────────────────
  const passages = chunks
    .map(
      (c, i) =>
        `**From ${c.manual_title}** (${c.section}, p. ${c.page} — *${c.heading}*):\n> "${c.text}" [#${i + 1}]`
    )
    .join("\n\n");

  return {
    answer:
      `Based on the policy manual passages retrieved for your query:\n\n` +
      `${passages}\n\n` +
      `*Tip: You can add a Gemini API key via the Key icon at the top to enable full AI answers for any query.*`,
    followups: [
      `What documentation is required under ${chunks[0]?.manual_title ?? "this policy"}?`,
      `How does ${chunks[0]?.section ?? "the endorsement"} affect claim payouts?`,
    ],
  };
}
