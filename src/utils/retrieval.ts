import { CHUNKS, ManualChunk } from "@/data/manuals";

// ─── Stopwords ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set(
  "a an the of and or to for in on at by from with is are was were be been being do does did have has had this that these those it its as if not no but i you he she we they my our your their what which who when where why how can could should would may might will".split(
    " "
  )
);

// ─── Tokeniser ──────────────────────────────────────────────────────────────
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ─── TF-IDF-style scoring with field boosts ──────────────────────────────────
// Heading / section title terms are 3× more important than body text.
// This prevents a chunk with dozens of generic body-text keyword hits from
// beating a chunk that directly names the topic in its heading.
export function score(query: string, c: ManualChunk): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const qSet = new Set(qTokens);

  let hits = 0;

  // High-weight: heading + section (exact topic match)
  const headingTokens = tokenize(`${c.heading} ${c.section}`);
  for (const t of headingTokens) {
    if (qSet.has(t)) hits += 3;
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

  // Bonus: every unique query token found (coverage reward)
  const uniqueHits = qTokens.filter((qt) =>
    [...headingTokens, ...titleTokens, ...bodyTokens].includes(qt)
  ).length;
  hits += uniqueHits * 0.5;

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
    // Only narrow corpus if there are actually chunks for that manual
    if (filtered.length > 0) candidates = filtered;
  }

  // Score & rank
  let ranked = candidates
    .map((c) => ({ chunk: c, s: score(query, c) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);

  // If filtering by manual yields no results, search the full corpus
  if (ranked.length === 0 && candidates !== allChunks) {
    ranked = allChunks
      .map((c) => ({ chunk: c, s: score(query, c) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
  }

  const topChunks = ranked.slice(0, 4).map((r) => r.chunk);

  if (topChunks.length === 0) {
    return {
      answer:
        "No matching passages were retrieved from the indexed manuals. " +
        "Rephrase the query using policy terminology (e.g., 'ACV', 'endorsement', " +
        "'Proof of Loss') or verify the selected manual repository.",
      citations: [],
      followups: [
        "What are the general proof of loss submission rules?",
        "What perils are covered under auto comprehensive?",
      ],
    };
  }

  const citations: RetrievalCitation[] = topChunks.map((c) => ({
    id: c.id,
    manual: c.manual_title,
    section: c.section,
    page: c.page,
    heading: c.heading,
    excerpt: c.text,
  }));

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
  if (q.includes("roof") || q.includes("depreciation") || q.includes("windstorm") || q.includes("ho-3")) {
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

  // ── Auto theft / stolen vehicle ───────────────────────────────────────────
  if (q.includes("stolen") || q.includes("theft") || q.includes("larceny") || q.includes("vehicle") || q.includes("auto")) {
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
  if (q.includes("power") || q.includes("utility") || q.includes("business income") || q.includes("spoilage") || q.includes("outage")) {
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
  if (q.includes("injury") || q.includes("worker") || q.includes("comp") || q.includes("ttd") || q.includes("disability") || q.includes("first report") || q.includes("wc-1")) {
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
  if (q.includes("proof of loss") || q.includes("documentation") || q.includes("settlement") || q.includes("acs") || q.includes("acv")) {
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

  // ── Generic fallback — stitch together top passages ───────────────────────
  const paragraphs = chunks
    .map(
      (c, i) =>
        `According to *${c.manual_title}* (${c.section}, p. ${c.page}) — "${c.heading}":\n${c.text} [#${i + 1}]`
    )
    .join("\n\n");

  return {
    answer: `Based on the retrieved manual passages:\n\n${paragraphs}`,
    followups: [
      `What are the documentation duties under ${chunks[0].manual_title}?`,
      `How does ${chunks[0].section} apply to loss settlement?`,
    ],
  };
}
