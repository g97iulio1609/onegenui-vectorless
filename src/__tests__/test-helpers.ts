import type { DocumentKnowledgeBase, Entity, KnowledgeNode, Relation } from '../domain/schemas.js';
import type { GraphEdge, GraphNode } from '../ports/graph-store.port.js';

// ─── KnowledgeNode factories ────────────────────────────────────────────────

/** Object-style: requires id and title, everything else optional with defaults. */
export function makeKnowledgeNode(
  overrides: Partial<KnowledgeNode> & { id: string; title: string },
): KnowledgeNode {
  return {
    level: 0,
    pageStart: 1,
    pageEnd: 1,
    summary: '',
    keyPoints: [],
    entities: [],
    keywords: [],
    quotes: [],
    internalRefs: [],
    externalRefs: [],
    children: [],
    ...overrides,
  };
}

/** Positional-style: convenience for tests that pass (id, title, keywords?, summary?). */
export function makeKnowledgeNodeSimple(
  id: string,
  title: string,
  keywords: string[] = [],
  summary = '',
): KnowledgeNode {
  return {
    id,
    title,
    level: 1,
    pageStart: 1,
    pageEnd: 2,
    summary: summary || `Summary of ${title}`,
    keyPoints: [],
    entities: [],
    keywords,
    quotes: [],
    internalRefs: [],
    externalRefs: [],
    children: [],
  };
}

// ─── DocumentKnowledgeBase factories ────────────────────────────────────────

/** Object-style: requires id and tree, everything else optional with defaults. */
export function makeKB(
  overrides: Partial<DocumentKnowledgeBase> & { id: string; tree: KnowledgeNode },
): DocumentKnowledgeBase {
  return {
    filename: 'test.pdf',
    mimeType: 'application/pdf',
    hash: 'abc123',
    processedAt: new Date().toISOString(),
    totalPages: 10,
    totalTokens: 1000,
    entities: [],
    relations: [],
    keywords: [],
    quotes: [],
    citations: [],
    metrics: {
      totalWords: 500,
      totalCharacters: 3000,
      averageWordsPerPage: 50,
      readingTimeMinutes: 2,
      complexityScore: 30,
      vocabularyRichness: 0.5,
      sentenceCount: 40,
      averageSentenceLength: 12,
      paragraphCount: 10,
    },
    description: 'Test knowledge base',
    keyInsights: [],
    ...overrides,
  };
}

/** Positional-style matching hybrid-search pattern: (id, filename, nodes, entities?, relations?). */
export function makeKBFromNodes(
  id: string,
  filename: string,
  nodes: KnowledgeNode[],
  entities: Entity[] = [],
  relations: Relation[] = [],
): DocumentKnowledgeBase {
  return {
    id,
    filename,
    mimeType: 'application/pdf',
    hash: `hash-${id}`,
    processedAt: new Date().toISOString(),
    totalPages: 10,
    totalTokens: 5000,
    tree: {
      id: `${id}-root`,
      title: filename,
      level: 0,
      pageStart: 1,
      pageEnd: 10,
      summary: `Root of ${filename}`,
      keyPoints: [],
      entities: [],
      keywords: [],
      quotes: [],
      internalRefs: [],
      externalRefs: [],
      children: nodes,
    },
    entities,
    relations,
    keywords: [],
    quotes: [],
    citations: [],
    metrics: {
      totalWords: 5000,
      totalCharacters: 30000,
      averageWordsPerPage: 500,
      readingTimeMinutes: 20,
      complexityScore: 50,
      vocabularyRichness: 0.6,
      sentenceCount: 200,
      averageSentenceLength: 15,
      paragraphCount: 40,
    },
    description: `Description of ${filename}`,
    keyInsights: [],
    processingMetadata: { version: '2.0.0' },
  };
}

/** Positional-style matching multi-doc pattern: (id, filename, opts?). */
export function makeKBFromOpts(
  id: string,
  filename: string,
  opts?: {
    entities?: Entity[];
    relations?: Relation[];
    nodes?: KnowledgeNode[];
  },
): DocumentKnowledgeBase {
  const nodes = opts?.nodes ?? [
    makeKnowledgeNodeSimple(`${id}-sec1`, `${filename} Section 1`, ['contract', 'penalty']),
    makeKnowledgeNodeSimple(`${id}-sec2`, `${filename} Section 2`, ['delivery', 'timeline']),
  ];
  return {
    id,
    filename,
    mimeType: 'application/pdf',
    hash: `hash-${id}`,
    processedAt: new Date().toISOString(),
    totalPages: 10,
    totalTokens: 5000,
    tree: {
      id: `${id}-root`,
      title: filename,
      level: 0,
      pageStart: 1,
      pageEnd: 10,
      summary: `Root of ${filename}`,
      keyPoints: [],
      entities: [],
      keywords: [],
      quotes: [],
      internalRefs: [],
      externalRefs: [],
      children: nodes,
    },
    entities: opts?.entities ?? [],
    relations: opts?.relations ?? [],
    keywords: [],
    quotes: [],
    citations: [],
    metrics: {
      totalWords: 5000,
      totalCharacters: 30000,
      averageWordsPerPage: 500,
      readingTimeMinutes: 20,
      complexityScore: 50,
      vocabularyRichness: 0.6,
      sentenceCount: 200,
      averageSentenceLength: 15,
      paragraphCount: 40,
    },
    description: `Description of ${filename}`,
    keyInsights: [],
    processingMetadata: { version: '2.0.0' },
  };
}

// ─── Graph factories ────────────────────────────────────────────────────────

export function makeGraphNode(
  id: string,
  label: string,
  type: GraphNode['type'] = 'entity',
): GraphNode {
  return { id, type, label, properties: {} };
}

export function makeGraphEdge(
  id: string,
  source: string,
  target: string,
  type = 'references',
  weight = 0.8,
): GraphEdge {
  return { id, source, target, type, weight, properties: {} };
}
