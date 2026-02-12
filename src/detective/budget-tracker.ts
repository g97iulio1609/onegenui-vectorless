import type { LanguageModel } from 'ai';
import type {
  LayerLevel,
  DetectiveOptions,
  InvestigationResult,
  InvestigationSource,
  Hypothesis,
  BudgetMode,
  DetectivePort,
  BUDGET_LIMITS,
  OP_COSTS,
} from '../ports/detective.port.js';

/** Tracks budget consumption during investigation */
export class BudgetTracker {
  private used = 0;
  private readonly limit: number;

  constructor(mode: BudgetMode) {
    const limits: Record<BudgetMode, number> = { fast: 10, balanced: 30, thorough: 100 };
    this.limit = limits[mode];
  }

  canAfford(cost: number): boolean {
    return this.used + cost <= this.limit;
  }

  spend(cost: number): void {
    this.used += cost;
  }

  getUsed(): number {
    return this.used;
  }

  getLimit(): number {
    return this.limit;
  }

  getRemaining(): number {
    return this.limit - this.used;
  }
}
