import { generateText, Output } from "ai";
import { z } from "zod";
const AnswerGenerationSchema = z.object({
    answer: z.string(),
    sources: z.array(z.object({
        nodeId: z.string(),
        pageNumber: z.number().int().min(1),
        excerpt: z.string(),
        confidence: z.number().min(0).max(1),
    })),
    confidence: z.number().min(0).max(1),
});
const jsonExample = `{
  "answer": "The document states that...",
  "sources": [
    {"nodeId": "node-1", "pageNumber": 5, "excerpt": "Relevant quote from page 5", "confidence": 0.95},
    {"nodeId": "node-3", "pageNumber": 12, "excerpt": "Supporting evidence", "confidence": 0.8}
  ],
  "confidence": 0.9
}`;
export class QuestionAnswerAgent {
    model;
    constructor(model) {
        this.model = model;
    }
    async *answerQuestion(question, knowledgeBase) {
        yield {
            event: {
                type: "started",
                timestamp: new Date().toISOString(),
                data: { phase: "question_answering", question },
            },
        };
        // Build context from knowledge base
        const context = this.buildContext(knowledgeBase);
        try {
            const { output } = await generateText({
                model: this.model,
                output: Output.object({ schema: AnswerGenerationSchema }),
                prompt: `Answer this question based ONLY on the document knowledge base provided.

QUESTION: ${question}

DOCUMENT: ${knowledgeBase.filename}
DESCRIPTION: ${knowledgeBase.description}

KEY INSIGHTS:
${knowledgeBase.keyInsights.join("\n")}

DOCUMENT STRUCTURE:
${context.structure}

ENTITIES:
${context.entities}

KEY QUOTES:
${context.quotes}

Instructions:
1. Answer using ONLY information from the document
2. Cite specific sections with page numbers
3. If the answer isn't in the document, say so clearly
4. Provide confidence score based on evidence quality

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object.`,
            });
            if (!output) {
                yield {
                    event: {
                        type: "error",
                        timestamp: new Date().toISOString(),
                        data: { error: "Failed to generate answer" },
                    },
                };
                return;
            }
            const answer = {
                id: `answer-${Date.now()}`,
                question,
                answer: output.answer,
                sources: output.sources,
                confidence: output.confidence,
                generatedAt: new Date().toISOString(),
            };
            yield {
                event: {
                    type: "completed",
                    timestamp: new Date().toISOString(),
                    data: { answerId: answer.id, confidence: answer.confidence },
                },
                answer,
            };
        }
        catch (error) {
            yield {
                event: {
                    type: "error",
                    timestamp: new Date().toISOString(),
                    data: { error: String(error) },
                },
            };
        }
    }
    buildContext(kb) {
        const structure = this.flattenTree(kb.tree)
            .map((n) => `${" ".repeat(n.level * 2)}- ${n.title} (p${n.pageStart}-${n.pageEnd}): ${n.summary}`)
            .join("\n");
        const entities = kb.entities
            .slice(0, 30)
            .map((e) => `- ${e.value} (${e.type})`)
            .join("\n");
        const quotes = kb.quotes
            .filter((q) => q.significance === "key")
            .slice(0, 10)
            .map((q) => `- "${q.text}" (p${q.pageNumber})`)
            .join("\n");
        return { structure, entities, quotes };
    }
    flattenTree(node, result = []) {
        result.push(node);
        for (const child of node.children || []) {
            this.flattenTree(child, result);
        }
        return result;
    }
}
//# sourceMappingURL=question-answer.js.map