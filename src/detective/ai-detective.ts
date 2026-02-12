import type { LanguageModel } from 'ai';
import type {
  DetectivePort,
  DetectiveOptions,
  InvestigationResult,
  LayerLevel,
} from '../ports/detective.port.js';
import type { MultiDocumentKBPort } from '../ports/multi-doc.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type { FullTextSearchPort } from '../ports/search.port.js';
import { BudgetTracker } from './budget-tracker.js';
import { classifyQueryLayer, classifyQueryLayerWithLLM } from './layer-router.js';
import { executeLayer1, executeLayer2, executeLayer3, executeLayer4 } from './layers.js';
import type { LayerDeps } from './layers.js';

/** AI Detective: 4-layer adaptive investigation engine */
export class AIDetective implements DetectivePort {
  constructor(
    private readonly model: LanguageModel,
    private readonly multiDoc: MultiDocumentKBPort,
    private readonly graph: GraphStorePort,
    private readonly search: FullTextSearchPort,
  ) {}

  async investigate(
    query: string,
    options?: DetectiveOptions,
  ): Promise<InvestigationResult> {
    const budgetMode = options?.budget ?? 'balanced';
    const budget = new BudgetTracker(budgetMode);

    const layer = options?.forceLayer ?? await this.classifyLayer(query);

    const deps: LayerDeps = {
      model: this.model,
      multiDoc: this.multiDoc,
      graph: this.graph,
      search: this.search,
      budget,
    };

    const executor = this.getLayerExecutor(layer);
    const result = await executor(query, deps);

    return {
      answer: result.answer,
      layer,
      hypotheses: result.hypotheses,
      sources: result.sources,
      budgetUsed: budget.getUsed(),
      budgetLimit: budget.getLimit(),
      thinking: result.thinking,
    };
  }

  async classifyLayer(query: string): Promise<LayerLevel> {
    const docCount = this.multiDoc.getDocumentCount();
    return classifyQueryLayer(query, docCount);
  }

  private getLayerExecutor(layer: LayerLevel) {
    const executors = {
      1: executeLayer1,
      2: executeLayer2,
      3: executeLayer3,
      4: executeLayer4,
    } as const;
    return executors[layer];
  }
}
