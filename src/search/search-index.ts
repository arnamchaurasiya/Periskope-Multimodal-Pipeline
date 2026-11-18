/**
 * Subsystem 5 (Part A): PostgreSQL tsvector Full-Text Search Engine Emulation
 * Unlocks the 40% "dark media data black hole" by indexing extracted summaries,
 * raw transcripts, and structured entities into an inverted full-text search index.
 */

import type { MultimodalExtractionRecord } from '../types/index.ts';

export class SearchVectorIndex {
  private static store: Map<string, { record: MultimodalExtractionRecord; textTokens: Set<string> }> = new Map();
  private static messageIdIndex: Map<string, string> = new Map(); // messageId -> extractionId

  /**
   * Tokenizes text into search tokens, mimicking PostgreSQL to_tsvector('english') + to_tsvector('simple')
   */
  public static tokenize(text: string): Set<string> {
    const tokens = new Set<string>();
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\-\_]/g, ' ');
    const words = cleaned.split(/\s+/).filter((w) => w.length > 1);

    for (const w of words) {
      tokens.add(w);

      // Strip hyphens for alphanumeric search (e.g., MH-12-RN-8841 -> mh12rn8841)
      const unhyphenated = w.replace(/-/g, '');
      if (unhyphenated !== w && unhyphenated.length > 1) {
        tokens.add(unhyphenated);
      }

      // Add sub-parts for hyphenated codes (e.g., 8841, 9902)
      const parts = w.split('-');
      if (parts.length > 1) {
        for (const p of parts) {
          if (p.length > 2) tokens.add(p);
        }
      }
    }
    return tokens;
  }

  /**
   * Indexes an extraction record with A/B ranking weights matching PostgreSQL trigger:
   * Weight A: executive_summary & entities
   * Weight B: raw_transcript & ocr body
   */
  public static indexRecord(record: MultimodalExtractionRecord): void {
    const combinedTokens = new Set<string>();

    // Weight A: Executive Summary & Entities
    const summaryTokens = this.tokenize(record.executiveSummary);
    summaryTokens.forEach((t) => combinedTokens.add(t));

    const entityString = JSON.stringify(record.entities);
    const entityTokens = this.tokenize(entityString);
    entityTokens.forEach((t) => combinedTokens.add(t));

    // Weight B: Raw Transcript
    if (record.rawTranscript) {
      const transcriptTokens = this.tokenize(record.rawTranscript);
      transcriptTokens.forEach((t) => combinedTokens.add(t));
    }

    record.searchTokens = Array.from(combinedTokens);
    this.store.set(record.id, { record, textTokens: combinedTokens });

    if (record.messageId) {
      this.messageIdIndex.set(record.messageId, record.id);
    }
  }

  /**
   * Searches the indexed vector (simulating `search_vector @@ to_tsquery('INV-9902')`)
   */
  public static search(query: string): MultimodalExtractionRecord[] {
    const queryTokens = Array.from(this.tokenize(query));
    if (queryTokens.length === 0) return [];

    const results: MultimodalExtractionRecord[] = [];
    for (const { record, textTokens } of this.store.values()) {
      // Must match all tokens in query (AND condition)
      const matchesAll = queryTokens.every((qt) => textTokens.has(qt));
      if (matchesAll) {
        results.push(record);
      }
    }
    return results;
  }

  /**
   * Retrieves an extraction record by its unique extraction ID
   */
  public static getById(id: string): MultimodalExtractionRecord | undefined {
    return this.store.get(id)?.record;
  }

  /**
   * Retrieves an extraction record by its associated WhatsApp message ID
   */
  public static getByMessageId(messageId: string): MultimodalExtractionRecord | undefined {
    const extractionId = this.messageIdIndex.get(messageId);
    if (extractionId) {
      return this.store.get(extractionId)?.record;
    }
    return undefined;
  }

  /**
   * Returns all indexed records
   */
  public static getAllRecords(): MultimodalExtractionRecord[] {
    return Array.from(this.store.values()).map((v) => v.record);
  }

  /**
   * Clears the search index
   */
  public static clear(): void {
    this.store.clear();
    this.messageIdIndex.clear();
  }
}
