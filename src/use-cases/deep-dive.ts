import type { LanguageModel } from "ai";
import type {
  CachePort,
  KnowledgeBaseRepositoryPort,
  Page,
  DeepDiveRequest,
  DeepDiveResult,
} from "../ports/index.js";
import { DeepDiveAgent } from "../agents/deep-dive.js";

interface DeepDiveUseCaseDeps {
  cache: CachePort;
  kbRepository: KnowledgeBaseRepositoryPort;
  model: LanguageModel;
  getPages: (kbId: string) => Promise<Page[]>;
}

export class DeepDiveUseCase {
  constructor(private deps: DeepDiveUseCaseDeps) {}

  async execute(request: DeepDiveRequest): Promise<DeepDiveResult> {
    const { nodeId, knowledgeBaseId, options = {} } = request;

    // Load knowledge base
    const kb = await this.deps.kbRepository.findById(knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base ${knowledgeBaseId} not found`);
    }

    // Check cache
    const cacheKey = `deepdive:${knowledgeBaseId}:${nodeId}`;
    const cached = await this.deps.cache.get<DeepDiveResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get pages for the document
    const pages = await this.deps.getPages(knowledgeBaseId);

    // Create deep dive agent
    const agent = new DeepDiveAgent(this.deps.model);
    let result: DeepDiveResult | null = null;

    for await (const { node } of agent.deepDive(nodeId, kb, pages)) {
      if (node) {
        result = { node };
      }
    }

    if (!result) {
      throw new Error(`Failed to deep dive into node ${nodeId}`);
    }

    // Cache result
    await this.deps.cache.set(cacheKey, result, 86400000); // 24 hours

    return result;
  }
}
