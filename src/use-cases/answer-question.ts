import type { LanguageModel } from "ai";
import type {
  CachePort,
  KnowledgeBaseRepositoryPort,
  AnswerQuestionRequest,
  AnswerQuestionResult,
} from "../ports/index.js";
import { QuestionAnswerAgent } from "../agents/question-answer.js";

interface AnswerQuestionUseCaseDeps {
  cache: CachePort;
  kbRepository: KnowledgeBaseRepositoryPort;
  model: LanguageModel;
}

export class AnswerQuestionUseCase {
  constructor(private deps: AnswerQuestionUseCaseDeps) {}

  async execute(request: AnswerQuestionRequest): Promise<AnswerQuestionResult> {
    const { question, knowledgeBaseId, options = {} } = request;
    const { maxSources = 5, minConfidence = 0.3 } = options;

    // Load knowledge base
    const kb = await this.deps.kbRepository.findById(knowledgeBaseId);
    if (!kb) {
      throw new Error(`Knowledge base ${knowledgeBaseId} not found`);
    }

    // Check cache for similar questions
    const cacheKey = `qa:${knowledgeBaseId}:${this.hashQuestion(question)}`;
    const cached = await this.deps.cache.get<AnswerQuestionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Create Q&A agent and generate answer
    const agent = new QuestionAnswerAgent(this.deps.model);
    let result: AnswerQuestionResult | null = null;

    for await (const { answer } of agent.answerQuestion(question, kb)) {
      if (answer) {
        // Filter sources by confidence
        const filteredSources = answer.sources
          .filter((s) => s.confidence >= minConfidence)
          .slice(0, maxSources);

        result = {
          answer: {
            ...answer,
            sources: filteredSources,
          },
        };
      }
    }

    if (!result) {
      throw new Error("Failed to generate answer");
    }

    // Cache result
    await this.deps.cache.set(cacheKey, result, 3600000); // 1 hour

    return result;
  }

  private hashQuestion(question: string): string {
    // Simple hash for caching similar questions
    return question
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 100);
  }
}
