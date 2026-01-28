import type { LanguageModel } from "ai";
import type { CachePort, KnowledgeBaseRepositoryPort, AnswerQuestionRequest, AnswerQuestionResult } from "../ports/index.js";
interface AnswerQuestionUseCaseDeps {
    cache: CachePort;
    kbRepository: KnowledgeBaseRepositoryPort;
    model: LanguageModel;
}
export declare class AnswerQuestionUseCase {
    private deps;
    constructor(deps: AnswerQuestionUseCaseDeps);
    execute(request: AnswerQuestionRequest): Promise<AnswerQuestionResult>;
    private hashQuestion;
}
export {};
//# sourceMappingURL=answer-question.d.ts.map