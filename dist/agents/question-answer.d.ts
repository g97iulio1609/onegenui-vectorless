import { type LanguageModel } from "ai";
import type { QuestionAnswerPort } from "../ports/index.js";
import type { DocumentKnowledgeBase, SSEEvent, Answer } from "../domain/schemas.js";
export declare class QuestionAnswerAgent implements QuestionAnswerPort {
    private model;
    constructor(model: LanguageModel);
    answerQuestion(question: string, knowledgeBase: DocumentKnowledgeBase): AsyncGenerator<{
        event: SSEEvent;
        answer?: Answer;
    }>;
    private buildContext;
    private flattenTree;
}
//# sourceMappingURL=question-answer.d.ts.map