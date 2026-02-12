import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize } from '../search/tokenizer.js';
import { BM25Adapter } from '../search/bm25-adapter.js';
import { makeKnowledgeNode as makeNode, makeKB } from './test-helpers.js';

// ─── Tokenizer tests ─────────────────────────────────────────────────────────

describe('Tokenizer', () => {
  it('lowercases and splits on non-word characters', () => {
    const tokens = tokenize('Hello World! Foo-Bar');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('foo');
    expect(tokens).toContain('bar');
  });

  it('removes English stopwords', () => {
    const tokens = tokenize('the quick brown fox is jumping over the lazy dog');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('over');
    expect(tokens).toContain('quick');
    expect(tokens).toContain('brown');
    expect(tokens).toContain('fox');
  });

  it('removes Italian stopwords', () => {
    const tokens = tokenize('il gatto della casa', { language: 'it' });
    expect(tokens).not.toContain('il');
    expect(tokens).not.toContain('della');
    expect(tokens).toContain('gatto');
    expect(tokens).toContain('casa');
  });

  it('multi-language removes both EN and IT stopwords', () => {
    const tokens = tokenize('the gatto is nella casa', { language: 'multi' });
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('nella');
    expect(tokens).toContain('gatto');
    expect(tokens).toContain('casa');
  });

  it('filters tokens shorter than minLength', () => {
    const tokens = tokenize('I go to bed', { minLength: 3 });
    expect(tokens).not.toContain('go');
    expect(tokens).toContain('bed');
  });

  it('applies English stemming', () => {
    const tokens = tokenize('running jumped organizes', { stemming: true });
    expect(tokens).toContain('runn');
    expect(tokens).toContain('jump');
    expect(tokens).toContain('organiz');
  });

  it('applies Italian stemming', () => {
    const tokens = tokenize('organizzazione velocemente', {
      language: 'it',
      stemming: true,
    });
    expect(tokens).toContain('organizza');
    expect(tokens).toContain('veloce');
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });
});

// ─── BM25 Adapter tests ──────────────────────────────────────────────────────

describe('BM25Adapter', () => {
  let adapter: BM25Adapter;

  const sampleTree = makeNode({
    id: 'root',
    title: 'Machine Learning Fundamentals',
    summary: 'An introduction to machine learning algorithms and neural networks',
    content: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data.',
    keywords: ['machine learning', 'neural networks', 'algorithms'],
    children: [
      makeNode({
        id: 'ch1',
        title: 'Supervised Learning',
        level: 1,
        pageStart: 2,
        pageEnd: 5,
        summary: 'Supervised learning uses labeled training data to learn a mapping function',
        content: 'In supervised learning, the algorithm learns from labeled examples. Common approaches include regression and classification.',
        keywords: ['supervised', 'classification', 'regression'],
        children: [
          makeNode({
            id: 'ch1-1',
            title: 'Linear Regression',
            level: 2,
            pageStart: 3,
            pageEnd: 4,
            summary: 'Linear regression predicts continuous values using a linear model',
            content: 'Linear regression fits a straight line to the data points minimizing the sum of squared errors.',
            keywords: ['regression', 'linear', 'prediction'],
          }),
        ],
      }),
      makeNode({
        id: 'ch2',
        title: 'Unsupervised Learning',
        level: 1,
        pageStart: 6,
        pageEnd: 10,
        summary: 'Unsupervised learning discovers hidden patterns in unlabeled data',
        content: 'Clustering and dimensionality reduction are key unsupervised techniques. K-means is a popular clustering algorithm.',
        keywords: ['unsupervised', 'clustering', 'dimensionality'],
      }),
    ],
  });

  const sampleKB = makeKB({
    id: 'kb-ml',
    tree: sampleTree,
  });

  beforeEach(() => {
    adapter = new BM25Adapter();
  });

  describe('indexing', () => {
    it('indexes a knowledge base and reports correct stats', () => {
      adapter.indexKnowledgeBase(sampleKB);
      const stats = adapter.getStats();
      expect(stats.documentCount).toBe(1);
      expect(stats.nodeCount).toBe(4); // root + ch1 + ch1-1 + ch2
      expect(stats.termCount).toBeGreaterThan(0);
    });

    it('indexes multiple knowledge bases', () => {
      adapter.indexKnowledgeBase(sampleKB);
      const kb2 = makeKB({
        id: 'kb-2',
        tree: makeNode({
          id: 'root2',
          title: 'Deep Learning',
          summary: 'Advanced deep learning with transformers',
          keywords: ['deep learning', 'transformers'],
        }),
      });
      adapter.indexKnowledgeBase(kb2);
      const stats = adapter.getStats();
      expect(stats.documentCount).toBe(2);
      expect(stats.nodeCount).toBe(5);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      adapter.indexKnowledgeBase(sampleKB);
    });

    it('finds results for a single-term query', () => {
      const results = adapter.search('regression');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    it('finds results for multi-term query', () => {
      const results = adapter.search('supervised classification');
      expect(results.length).toBeGreaterThan(0);
      const nodeIds = results.map((r) => r.nodeId);
      expect(nodeIds).toContain('ch1');
    });

    it('ranks title matches higher via field boosting', () => {
      const results = adapter.search('linear regression');
      expect(results.length).toBeGreaterThan(0);
      // ch1-1 has "Linear Regression" in its title → boosted
      expect(results[0]!.nodeId).toBe('ch1-1');
    });

    it('returns correct documentId', () => {
      const results = adapter.search('machine learning');
      for (const r of results) {
        expect(r.documentId).toBe('kb-ml');
      }
    });

    it('respects limit option', () => {
      const results = adapter.search('learning', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('respects fields filter', () => {
      const results = adapter.search('regression', { fields: ['title'] });
      expect(results.length).toBeGreaterThan(0);
      // Only title field should be reported
      for (const r of results) {
        expect(r.field).toBe('title');
      }
    });

    it('respects minScore filter', () => {
      const allResults = adapter.search('learning');
      const highScoreResults = adapter.search('learning', { minScore: 999 });
      expect(highScoreResults.length).toBeLessThan(allResults.length);
      expect(highScoreResults.length).toBe(0);
    });

    it('returns highlights containing matched terms', () => {
      const results = adapter.search('clustering');
      expect(results.length).toBeGreaterThan(0);
      const first = results[0]!;
      expect(first.highlights.length).toBeGreaterThan(0);
      const lower = first.highlights.join(' ').toLowerCase();
      expect(lower).toContain('cluster');
    });

    it('returns empty array for empty query', () => {
      expect(adapter.search('')).toEqual([]);
    });

    it('returns empty array when no terms match', () => {
      expect(adapter.search('xylophone')).toEqual([]);
    });

    it('handles special characters in query gracefully', () => {
      const results = adapter.search('machine!!! learning??? #awesome');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('removeDocument', () => {
    it('removes a document from the index', () => {
      adapter.indexKnowledgeBase(sampleKB);
      expect(adapter.getStats().documentCount).toBe(1);

      adapter.removeDocument('kb-ml');
      expect(adapter.getStats().documentCount).toBe(0);
      expect(adapter.getStats().nodeCount).toBe(0);

      const results = adapter.search('machine learning');
      expect(results).toEqual([]);
    });

    it('does nothing for unknown document', () => {
      adapter.indexKnowledgeBase(sampleKB);
      adapter.removeDocument('nonexistent');
      expect(adapter.getStats().documentCount).toBe(1);
    });
  });

  describe('multi-document search', () => {
    it('searches across multiple indexed KBs', () => {
      adapter.indexKnowledgeBase(sampleKB);

      const kb2 = makeKB({
        id: 'kb-cooking',
        tree: makeNode({
          id: 'cook-root',
          title: 'Italian Cooking',
          summary: 'Traditional Italian pasta and pizza recipes',
          content: 'Italian cuisine features pasta, pizza, risotto, and many other dishes.',
          keywords: ['pasta', 'pizza', 'Italian cuisine'],
        }),
      });
      adapter.indexKnowledgeBase(kb2);

      const mlResults = adapter.search('machine learning');
      expect(mlResults.some((r) => r.documentId === 'kb-ml')).toBe(true);
      expect(mlResults.some((r) => r.documentId === 'kb-cooking')).toBe(false);

      const cookResults = adapter.search('pasta pizza');
      expect(cookResults.some((r) => r.documentId === 'kb-cooking')).toBe(true);
      expect(cookResults.some((r) => r.documentId === 'kb-ml')).toBe(false);
    });
  });
});
