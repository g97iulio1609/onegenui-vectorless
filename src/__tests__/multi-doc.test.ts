import { describe, it, expect, beforeEach } from 'vitest';
import { MultiDocumentKB } from '../multi-doc/multi-document-kb.js';
import { EntityLinker } from '../multi-doc/entity-linker.js';
import { BM25Adapter } from '../search/bm25-adapter.js';
import { InMemoryGraphAdapter } from '../graph/in-memory-graph.adapter.js';
import type { DocumentKnowledgeBase, Entity, Relation, KnowledgeNode } from '../domain/schemas.js';

function makeKnowledgeNode(id: string, title: string, keywords: string[] = [], summary = ''): KnowledgeNode {
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

function makeKB(id: string, filename: string, opts?: {
  entities?: Entity[];
  relations?: Relation[];
  nodes?: KnowledgeNode[];
}): DocumentKnowledgeBase {
  const nodes = opts?.nodes ?? [
    makeKnowledgeNode(`${id}-sec1`, `${filename} Section 1`, ['contract', 'penalty']),
    makeKnowledgeNode(`${id}-sec2`, `${filename} Section 2`, ['delivery', 'timeline']),
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

describe('EntityLinker', () => {
  let linker: EntityLinker;

  beforeEach(() => {
    linker = new EntityLinker();
  });

  it('should link same entity across documents', () => {
    const entitiesDoc1: Entity[] = [{
      id: 'ent1',
      type: 'organization',
      value: 'ACME Corp',
      normalized: 'ACME Corp',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    }];
    const entitiesDoc2: Entity[] = [{
      id: 'ent2',
      type: 'organization',
      value: 'Acme Corp',
      normalized: 'acme corp',
      occurrences: [{ nodeId: 's2', pageNumber: 3 }],
    }];

    linker.linkEntities('doc1', entitiesDoc1);
    linker.linkEntities('doc2', entitiesDoc2);

    const links = linker.getLinks('ent1');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.documentId).sort()).toEqual(['doc1', 'doc2']);
  });

  it('should not link different entities', () => {
    const e1: Entity[] = [{
      id: 'ent1', type: 'organization', value: 'ACME',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    }];
    const e2: Entity[] = [{
      id: 'ent2', type: 'person', value: 'John Doe',
      occurrences: [{ nodeId: 's2', pageNumber: 1 }],
    }];

    linker.linkEntities('doc1', e1);
    linker.linkEntities('doc2', e2);

    expect(linker.getLinks('ent1')).toHaveLength(1);
    expect(linker.getLinks('ent2')).toHaveLength(1);
  });

  it('should remove document links', () => {
    const e: Entity[] = [{
      id: 'ent1', type: 'organization', value: 'ACME',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    }];
    linker.linkEntities('doc1', e);
    linker.linkEntities('doc2', [{ ...e[0], id: 'ent2' }]);
    linker.removeDocument('doc1');
    expect(linker.getLinks('ent1')).toHaveLength(0);
  });
});

describe('MultiDocumentKB', () => {
  let multiDoc: MultiDocumentKB;
  let bm25: BM25Adapter;
  let graph: InMemoryGraphAdapter;

  beforeEach(() => {
    bm25 = new BM25Adapter();
    graph = new InMemoryGraphAdapter();
    multiDoc = new MultiDocumentKB(bm25, graph);
  });

  it('should add and list documents', () => {
    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf'));
    multiDoc.addKnowledgeBase(makeKB('doc2', 'Report.pdf'));

    expect(multiDoc.getDocumentCount()).toBe(2);
    const docs = multiDoc.listDocuments();
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.filename).sort()).toEqual(['Contract.pdf', 'Report.pdf']);
  });

  it('should retrieve a KB by id', () => {
    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf'));
    expect(multiDoc.getKnowledgeBase('doc1')?.filename).toBe('Contract.pdf');
    expect(multiDoc.getKnowledgeBase('nope')).toBeUndefined();
  });

  it('should search across multiple documents', () => {
    const kb1 = makeKB('doc1', 'Contract.pdf', {
      nodes: [makeKnowledgeNode('s1', 'Penalty Clause', ['penalty', 'clause'], 'The penalty clause specifies a 5% fee')],
    });
    const kb2 = makeKB('doc2', 'Report.pdf', {
      nodes: [makeKnowledgeNode('s2', 'Financial Results', ['revenue', 'profit'], 'Q3 revenue grew by 15%')],
    });

    multiDoc.addKnowledgeBase(kb1);
    multiDoc.addKnowledgeBase(kb2);

    const results = multiDoc.search('penalty clause');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].documentId).toBe('doc1');
    expect(results[0].filename).toBe('Contract.pdf');
  });

  it('should filter search by document IDs', () => {
    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf', {
      nodes: [makeKnowledgeNode('s1', 'Penalty', ['penalty'])],
    }));
    multiDoc.addKnowledgeBase(makeKB('doc2', 'Other.pdf', {
      nodes: [makeKnowledgeNode('s2', 'Penalty Fees', ['penalty'])],
    }));

    const results = multiDoc.search('penalty', { documentIds: ['doc1'] });
    for (const r of results) {
      expect(r.documentId).toBe('doc1');
    }
  });

  it('should remove a document', () => {
    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf'));
    multiDoc.removeKnowledgeBase('doc1');
    expect(multiDoc.getDocumentCount()).toBe(0);
    expect(multiDoc.getKnowledgeBase('doc1')).toBeUndefined();
  });

  it('should create cross-doc entity links', () => {
    const acmeEntity1: Entity = {
      id: 'ent1', type: 'organization', value: 'ACME Corp',
      normalized: 'acme corp',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    };
    const acmeEntity2: Entity = {
      id: 'ent2', type: 'organization', value: 'Acme Corp',
      normalized: 'acme corp',
      occurrences: [{ nodeId: 's2', pageNumber: 5 }],
    };

    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf', { entities: [acmeEntity1] }));
    multiDoc.addKnowledgeBase(makeKB('doc2', 'Report.pdf', { entities: [acmeEntity2] }));

    const links = multiDoc.getEntityLinks('ent1');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.documentId).sort()).toEqual(['doc1', 'doc2']);
  });

  it('should add document nodes to graph', () => {
    multiDoc.addKnowledgeBase(makeKB('doc1', 'Contract.pdf'));
    const docNode = graph.getNode('doc:doc1');
    expect(docNode).toBeDefined();
    expect(docNode?.type).toBe('document');
    expect(docNode?.label).toBe('Contract.pdf');
  });

  it('should index entities in graph', () => {
    const entity: Entity = {
      id: 'ent1', type: 'person', value: 'John Doe',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    };
    multiDoc.addKnowledgeBase(makeKB('doc1', 'File.pdf', { entities: [entity] }));
    expect(graph.getNode('ent1')).toBeDefined();
    expect(graph.getNode('ent1')?.label).toBe('John Doe');
  });

  it('should index relations in graph', () => {
    const relations: Relation[] = [{
      id: 'rel1',
      sourceNodeId: 'sec1',
      targetNodeId: 'sec2',
      type: 'supports',
      confidence: 0.9,
    }];
    graph.addNode({ id: 'sec1', type: 'section', label: 'S1', properties: {} });
    graph.addNode({ id: 'sec2', type: 'section', label: 'S2', properties: {} });
    multiDoc.addKnowledgeBase(makeKB('doc1', 'File.pdf', { relations }));
    expect(graph.getEdge('rel1')).toBeDefined();
  });

  it('should create cross-doc edges in graph', () => {
    const ent1: Entity = {
      id: 'ent1', type: 'organization', value: 'ACME',
      normalized: 'acme',
      occurrences: [{ nodeId: 's1', pageNumber: 1 }],
    };
    const ent2: Entity = {
      id: 'ent2', type: 'organization', value: 'Acme',
      normalized: 'acme',
      occurrences: [{ nodeId: 's2', pageNumber: 1 }],
    };

    multiDoc.addKnowledgeBase(makeKB('doc1', 'A.pdf', { entities: [ent1] }));
    multiDoc.addKnowledgeBase(makeKB('doc2', 'B.pdf', { entities: [ent2] }));

    const edge = graph.getEdge('xdoc:ent2:ent1');
    expect(edge).toBeDefined();
    expect(edge?.type).toBe('same_entity');
  });
});
