import { describe, it, expect } from 'vitest';
import { BudgetTracker } from '../detective/budget-tracker.js';
import { classifyQueryLayer } from '../detective/layer-router.js';
import type { LayerLevel } from '../ports/detective.port.js';

describe('BudgetTracker', () => {
  it('should initialize with correct limits', () => {
    expect(new BudgetTracker('fast').getLimit()).toBe(10);
    expect(new BudgetTracker('balanced').getLimit()).toBe(30);
    expect(new BudgetTracker('thorough').getLimit()).toBe(100);
  });

  it('should track spending', () => {
    const budget = new BudgetTracker('fast');
    budget.spend(3);
    expect(budget.getUsed()).toBe(3);
    expect(budget.getRemaining()).toBe(7);
  });

  it('should check affordability', () => {
    const budget = new BudgetTracker('fast');
    expect(budget.canAfford(10)).toBe(true);
    expect(budget.canAfford(11)).toBe(false);
    budget.spend(8);
    expect(budget.canAfford(3)).toBe(false);
    expect(budget.canAfford(2)).toBe(true);
  });
});

describe('Layer Router (pattern-based)', () => {
  const cases: Array<[string, number, LayerLevel]> = [
    // Layer 1: Reader — specific text queries
    ['Leggi la clausola 7.3 del contratto ACME', 1, 1],
    ['Read section 5 of the report', 1, 1],
    ['Mostra il paragrafo sulla penale', 1, 1],
    ['Show me the specific clause about termination', 1, 1],
    ['Cosa dice la sezione sulla garanzia?', 1, 1],
    ['Quote the definition of force majeure', 1, 1],

    // Layer 2: Analyst — cross-doc analysis
    ['Come gli obblighi impattano i risultati finanziari?', 10, 2],
    ['Compare the two contracts', 5, 2],
    ['Qual è la connessione tra il report e il contratto?', 10, 2],
    ['How does the penalty relate to delivery terms?', 10, 2],

    // Layer 3: Strategist — patterns and trends
    ['Quali clienti sono a rischio churn?', 50, 3],
    ['What are the emerging trends?', 50, 3],
    ['Identify anomalies in the data', 50, 3],
    ['Which patterns suggest risk?', 50, 3],

    // Layer 4: Meta-Strategist — executive overview
    ['Qual è lo stato di salute aziendale?', 100, 4],
    ['Give me the strategic priorities', 100, 4],
    ['Executive overview of the company', 100, 4],
    ['Panoramica complessiva della situazione', 100, 4],
  ];

  it.each(cases)('"%s" (docCount=%d) → Layer %d', (query, docCount, expected) => {
    expect(classifyQueryLayer(query, docCount)).toBe(expected);
  });

  describe('Scale-based fallback (no pattern match)', () => {
    it('should use Layer 1 for < 5 docs', () => {
      expect(classifyQueryLayer('generic question', 3)).toBe(1);
    });

    it('should use Layer 2 for 5-49 docs', () => {
      expect(classifyQueryLayer('generic question', 20)).toBe(2);
    });

    it('should use Layer 3 for 50-499 docs', () => {
      expect(classifyQueryLayer('generic question', 200)).toBe(3);
    });

    it('should use Layer 4 for 500+ docs', () => {
      expect(classifyQueryLayer('generic question', 1000)).toBe(4);
    });
  });
});
