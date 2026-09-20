import { describe, it, expect } from "vitest";
import { tokenize, score, localRetrieve } from "@/utils/retrieval";
import { CHUNKS } from "@/data/manuals";

// ─── tokenize ────────────────────────────────────────────────────────────────
describe("tokenize", () => {
  it("lowercases and splits on whitespace", () => {
    const result = tokenize("Roof Settlement");
    expect(result).toContain("roof");
    expect(result).toContain("settlement");
  });

  it("strips stopwords", () => {
    const result = tokenize("what is the coverage for the roof");
    expect(result).not.toContain("what");
    expect(result).not.toContain("is");
    expect(result).not.toContain("the");
    expect(result).not.toContain("for");
    expect(result).toContain("coverage");
    expect(result).toContain("roof");
  });

  it("strips parentheses and colons but preserves hyphens", () => {
    const result = tokenize("Proof-of-Loss: (Section 4.A)");
    // Hyphens are preserved — "proof-of-loss" stays as one token
    expect(result).toContain("proof-of-loss");
    expect(result).toContain("section");
    // Standalone short fragments like "a" are filtered
    expect(result).not.toContain("a");
  });

  it("filters tokens shorter than 3 chars", () => {
    const result = tokenize("ACV is ok to use");
    expect(result).not.toContain("is");
    expect(result).not.toContain("to");
    // "acv" is 3 chars — should be included
    expect(result).toContain("acv");
  });

  it("returns empty array for empty or stopword-only input", () => {
    expect(tokenize("")).toHaveLength(0);
    expect(tokenize("the and or a")).toHaveLength(0);
  });
});

// ─── score ───────────────────────────────────────────────────────────────────
describe("score", () => {
  it("returns 0 for empty query", () => {
    expect(score("", CHUNKS[0])).toBe(0);
  });

  it("returns 0 for a completely unrelated query", () => {
    const s = score("quantum physics nuclear fusion", CHUNKS[0]);
    expect(s).toBe(0);
  });

  it("scores roof chunk highest for a roof query", () => {
    const roofQuery = "Is depreciation applied to roof replacement windstorm hail";
    const roofChunk = CHUNKS.find((c) => c.id === "pc-2")!;
    const otherChunks = CHUNKS.filter((c) => c.id !== "pc-2");

    const roofScore = score(roofQuery, roofChunk);
    for (const other of otherChunks) {
      expect(roofScore).toBeGreaterThan(score(roofQuery, other));
    }
  });

  it("scores auto theft chunk highest for a stolen vehicle query", () => {
    const query = "stolen vehicle documentation theft claim police report";
    const autoChunk = CHUNKS.find((c) => c.id === "auto-2")!;
    const autoScore = score(query, autoChunk);
    const pc1Score = score(query, CHUNKS.find((c) => c.id === "pc-1")!);
    expect(autoScore).toBeGreaterThan(pc1Score);
  });

  it("scores workers comp chunk highest for a WC query", () => {
    const query = "first report of injury workers comp filing deadline";
    const wcChunk = CHUNKS.find((c) => c.id === "wc-1")!;
    const commChunk = CHUNKS.find((c) => c.id === "comm-1")!;
    expect(score(query, wcChunk)).toBeGreaterThan(score(query, commChunk));
  });

  it("heading match outweighs body match (field boost)", () => {
    // pc-2 has "Windstorm or Hail" in its heading
    // pc-4 only mentions utility failure
    const windstormChunk = CHUNKS.find((c) => c.id === "pc-2")!;
    const utilityChunk = CHUNKS.find((c) => c.id === "pc-4")!;
    const s1 = score("windstorm hail roof", windstormChunk);
    const s2 = score("windstorm hail roof", utilityChunk);
    expect(s1).toBeGreaterThan(s2);
  });
});

// ─── localRetrieve ───────────────────────────────────────────────────────────
describe("localRetrieve", () => {
  it("returns an answer, citations, and followups for a roof query", async () => {
    const result = await localRetrieve("roof depreciation HO-3 windstorm");
    expect(result.answer).toBeTruthy();
    expect(result.answer.length).toBeGreaterThan(50);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.followups.length).toBeGreaterThan(0);
  });

  it("returns an answer for a stolen vehicle query", async () => {
    const result = await localRetrieve("stolen vehicle documentation theft claim");
    expect(result.answer).toContain("police report");
    expect(result.citations.some((c) => c.id === "auto-2")).toBe(true);
  });

  it("returns an answer for a workers comp query", async () => {
    const result = await localRetrieve("first report of injury workers comp deadline");
    expect(result.answer).toContain("7");
    expect(result.citations.some((c) => c.id === "wc-1")).toBe(true);
  });

  it("returns an answer for a power outage / business income query", async () => {
    const result = await localRetrieve("business income power outage utility endorsement");
    expect(result.answer).toBeTruthy();
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it("returns no-match message for a completely unrelated query", async () => {
    const result = await localRetrieve("deep sea fishing regulations trawler net");
    expect(result.citations).toHaveLength(0);
    expect(result.answer).toContain("No matching passages");
  });

  it("filters by activeManualId when provided", async () => {
    // Query about auto — if we lock to wc-guide, should fall back or give wc results
    const result = await localRetrieve("rental reimbursement vehicle", "wc-guide");
    // With no matching wc chunks it should fall back to all-corpus
    expect(result.answer).toBeTruthy();
  });

  it("citation shape has all required fields", async () => {
    const result = await localRetrieve("proof of loss documentation");
    for (const c of result.citations) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("manual");
      expect(c).toHaveProperty("section");
      expect(c).toHaveProperty("page");
      expect(c).toHaveProperty("heading");
      expect(c).toHaveProperty("excerpt");
    }
  });
});
