import { generateText, Output } from "ai";
import { z } from "zod";
const EntityExtractionSchema = z.object({
    entities: z.array(z.object({
        type: z.enum([
            "person",
            "date",
            "place",
            "concept",
            "organization",
            "event",
            "number",
            "term",
        ]),
        value: z.string(),
        normalized: z.string().optional(),
        description: z.string().optional(),
        confidence: z.number().min(0).max(1),
    })),
});
const jsonExample = `{
  "entities": [
    {"type": "person", "value": "John Smith", "normalized": "Smith, John", "confidence": 0.95},
    {"type": "date", "value": "January 2024", "normalized": "2024-01", "confidence": 0.9},
    {"type": "organization", "value": "ACME Corp", "confidence": 0.85}
  ]
}`;
export class EntityExtractorAgent {
    model;
    constructor(model) {
        this.model = model;
    }
    async *extractEntities(pages, tree) {
        yield {
            event: {
                type: "started",
                timestamp: new Date().toISOString(),
                data: { phase: "entity_extraction" },
            },
        };
        const nodeTexts = this.collectNodeTexts(tree, pages);
        let entityId = 0;
        for (const { nodeId, text, pageStart } of nodeTexts) {
            if (!text || text.length < 50)
                continue;
            try {
                const { output } = await generateText({
                    model: this.model,
                    output: Output.object({ schema: EntityExtractionSchema }),
                    prompt: `Extract all named entities from this text. For each entity identify its type and provide a normalized form if applicable.

TEXT:
${text.slice(0, 4000)}

Extract: people, dates, places, concepts, organizations, events, numbers, technical terms.

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with entities.`,
                });
                if (!output)
                    continue;
                for (const e of output.entities) {
                    const entity = {
                        id: `entity-${++entityId}`,
                        type: e.type,
                        value: e.value,
                        normalized: e.normalized,
                        description: e.description,
                        confidence: e.confidence,
                        occurrences: [
                            {
                                nodeId,
                                pageNumber: pageStart,
                            },
                        ],
                    };
                    yield {
                        event: {
                            type: "entity_extracted",
                            timestamp: new Date().toISOString(),
                            data: { entityId: entity.id, type: entity.type },
                        },
                        entity,
                    };
                }
            }
            catch (error) {
                yield {
                    event: {
                        type: "error",
                        timestamp: new Date().toISOString(),
                        data: { nodeId, error: String(error) },
                    },
                };
            }
        }
    }
    collectNodeTexts(node, pages, result = []) {
        const nodeId = node.id || `node-${result.length}`;
        const pageStart = node.pageStart || 1;
        const pageEnd = node.pageEnd || pageStart;
        const text = pages
            .filter((p) => p.pageNumber >= pageStart && p.pageNumber <= pageEnd)
            .map((p) => p.content)
            .join("\n");
        result.push({ nodeId, text, pageStart });
        for (const child of node.children || []) {
            this.collectNodeTexts(child, pages, result);
        }
        return result;
    }
}
//# sourceMappingURL=entity-extractor.js.map