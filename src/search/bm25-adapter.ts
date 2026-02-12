import type { DocumentKnowledgeBase, KnowledgeNode } from '../domain/schemas.js';
import type {
  FullTextSearchPort,
  SearchOptions,
  SearchResult,
} from '../ports/search.port.js';
import { tokenize, type TokenizerOptions } from './tokenizer.js';

interface TermPosting {
  tf: number;
  field: string;
}

interface DocEntry {
  documentId: string;
  nodeId: string;
  fieldLengths: Record<string, number>;
  rawFields: Record<string, string>;
}

const FIELD_BOOSTS: Record<string, number> = {
  title: 3.0,
  keywords: 2.0,
  summary: 1.5,
  content: 1.0,
};

const ALL_FIELDS = Object.keys(FIELD_BOOSTS);
const K1 = 1.2;
const B = 0.75;
const HIGHLIGHT_RADIUS = 30;

export class BM25Adapter implements FullTextSearchPort {
  private index = new Map<string, Map<string, TermPosting>>();
  private docs = new Map<string, DocEntry>();
  private docsByDocument = new Map<string, Set<string>>();
  private totalFieldLengths = 0;
  private tokenizerOptions: TokenizerOptions;

  constructor(tokenizerOptions?: TokenizerOptions) {
    this.tokenizerOptions = { stemming: true, ...tokenizerOptions };
  }

  indexKnowledgeBase(kb: DocumentKnowledgeBase): void {
    this.walkNode(kb.tree, kb.id);
  }

  removeDocument(documentId: string): void {
    const nodeIds = this.docsByDocument.get(documentId);
    if (!nodeIds) return;

    for (const nodeId of nodeIds) {
      const docKey = `${documentId}:${nodeId}`;
      const entry = this.docs.get(docKey);
      if (entry) {
        this.totalFieldLengths -= sumValues(entry.fieldLengths);
        this.docs.delete(docKey);
      }
      this.removeFromIndex(docKey);
    }
    this.docsByDocument.delete(documentId);
  }

  search(query: string, options?: SearchOptions): SearchResult[] {
    const limit = options?.limit ?? 10;
    const fields = options?.fields ?? ALL_FIELDS;
    const minScore = options?.minScore ?? 0.0;
    const queryTokens = tokenize(query, this.tokenizerOptions);

    if (queryTokens.length === 0) return [];

    const scores = new Map<string, number>();
    const matchedFields = new Map<string, string>();
    const matchedTerms = new Map<string, Set<string>>();
    const N = this.docs.size;
    const avgdl = N > 0 ? this.totalFieldLengths / N : 1;

    for (const token of queryTokens) {
      const postings = this.index.get(token);
      if (!postings) continue;

      const df = postings.size;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      for (const [docKey, posting] of postings) {
        if (!fields.includes(posting.field)) continue;

        const entry = this.docs.get(docKey);
        if (!entry) continue;

        const dl = sumValues(entry.fieldLengths);
        const tf = posting.tf;
        const fieldBoost = FIELD_BOOSTS[posting.field] ?? 1.0;
        const score =
          idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (dl / avgdl))));
        const boosted = score * fieldBoost;

        scores.set(docKey, (scores.get(docKey) ?? 0) + boosted);

        const prev = matchedFields.get(docKey);
        if (!prev || (FIELD_BOOSTS[posting.field] ?? 0) > (FIELD_BOOSTS[prev] ?? 0)) {
          matchedFields.set(docKey, posting.field);
        }

        if (!matchedTerms.has(docKey)) matchedTerms.set(docKey, new Set());
        matchedTerms.get(docKey)!.add(token);
      }
    }

    return Array.from(scores.entries())
      .filter(([, s]) => s >= minScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docKey, score]) => {
        const entry = this.docs.get(docKey)!;
        const field = matchedFields.get(docKey) ?? 'content';
        const terms = matchedTerms.get(docKey) ?? new Set<string>();
        return {
          documentId: entry.documentId,
          nodeId: entry.nodeId,
          score,
          field,
          highlights: buildHighlights(entry.rawFields, terms),
        };
      });
  }

  getStats(): { documentCount: number; termCount: number; nodeCount: number } {
    return {
      documentCount: this.docsByDocument.size,
      termCount: this.index.size,
      nodeCount: this.docs.size,
    };
  }

  // --- private helpers ---

  private walkNode(node: KnowledgeNode, documentId: string): void {
    this.indexNode(node, documentId);
    for (const child of node.children) {
      this.walkNode(child, documentId);
    }
  }

  private indexNode(node: KnowledgeNode, documentId: string): void {
    const docKey = `${documentId}:${node.id}`;
    const fieldTexts: Record<string, string> = {
      title: node.title,
      summary: node.summary ?? '',
      content: node.rawText ?? node.content ?? '',
      keywords: (node.keywords ?? []).join(' '),
    };

    const fieldLengths: Record<string, number> = {};

    for (const [field, text] of Object.entries(fieldTexts)) {
      const tokens = tokenize(text, this.tokenizerOptions);
      fieldLengths[field] = tokens.length;
      const tfMap = new Map<string, number>();
      for (const t of tokens) tfMap.set(t, (tfMap.get(t) ?? 0) + 1);

      for (const [term, tf] of tfMap) {
        if (!this.index.has(term)) this.index.set(term, new Map());
        const existing = this.index.get(term)!.get(docKey);
        if (!existing || tf > existing.tf) {
          this.index.get(term)!.set(docKey, { tf, field });
        }
      }
    }

    this.docs.set(docKey, {
      documentId,
      nodeId: node.id,
      fieldLengths,
      rawFields: fieldTexts,
    });
    this.totalFieldLengths += sumValues(fieldLengths);

    if (!this.docsByDocument.has(documentId)) {
      this.docsByDocument.set(documentId, new Set());
    }
    this.docsByDocument.get(documentId)!.add(node.id);
  }

  private removeFromIndex(docKey: string): void {
    for (const [, postings] of this.index) {
      postings.delete(docKey);
    }
    // clean empty terms
    for (const [term, postings] of this.index) {
      if (postings.size === 0) this.index.delete(term);
    }
  }
}

function sumValues(obj: Record<string, number>): number {
  let sum = 0;
  for (const v of Object.values(obj)) sum += v;
  return sum;
}

function buildHighlights(
  rawFields: Record<string, string>,
  terms: Set<string>,
): string[] {
  const highlights: string[] = [];
  const combined = Object.values(rawFields).join(' ');
  const lower = combined.toLowerCase();

  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx === -1) continue;

    const start = Math.max(0, idx - HIGHLIGHT_RADIUS);
    const end = Math.min(combined.length, idx + term.length + HIGHLIGHT_RADIUS);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < combined.length ? '...' : '';
    highlights.push(`${prefix}${combined.slice(start, end)}${suffix}`);
  }

  return highlights;
}
