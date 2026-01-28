import { generateText, Output } from "ai";
import { z } from "zod";
const RelationExtractionSchema = z.object({
    relations: z.array(z.object({
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        type: z.enum([
            "references",
            "contradicts",
            "supports",
            "elaborates",
            "precedes",
            "follows",
            "summarizes",
            "defines",
            "examples",
        ]),
        confidence: z.number().min(0).max(1),
        evidence: z.string().optional(),
    })),
});
const jsonExample = `{
  "relations": [
    {"sourceNodeId": "node-1", "targetNodeId": "node-3", "type": "references", "confidence": 0.9, "evidence": "Section 1 cites section 3"},
    {"sourceNodeId": "node-2", "targetNodeId": "node-4", "type": "elaborates", "confidence": 0.8}
  ]
}`;
export class RelationExtractorAgent {
    model;
    constructor(model) {
        this.model = model;
    }
    async *extractRelations(tree, entities) {
        yield {
            event: {
                type: "started",
                timestamp: new Date().toISOString(),
                data: { phase: "relation_extraction" },
            },
        };
        const nodes = this.flattenNodes(tree);
        if (nodes.length < 2)
            return;
        const nodeList = nodes
            .map((n) => `- ${n.id}: "${n.title}" (pages ${n.pageStart}-${n.pageEnd})`)
            .join("\n");
        const entityList = entities
            .slice(0, 50)
            .map((e) => `- ${e.value} (${e.type})`)
            .join("\n");
        try {
            const { output } = await generateText({
                model: this.model,
                output: Output.object({ schema: RelationExtractionSchema }),
                prompt: `Analyze the relationships between document sections.

SECTIONS:
${nodeList}

KEY ENTITIES:
${entityList}

Relation types:
- references: one section cites or mentions another
- contradicts: sections have conflicting information
- supports: one section provides evidence for another
- elaborates: one section expands on another
- precedes/follows: logical sequence
- summarizes: one section summarizes another
- defines: one section defines concepts used in another
- examples: one section provides examples for another

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with relationships.`,
            });
            if (!output)
                return;
            let relationId = 0;
            for (const r of output.relations) {
                const relation = {
                    id: `relation-${++relationId}`,
                    sourceNodeId: r.sourceNodeId,
                    targetNodeId: r.targetNodeId,
                    type: r.type,
                    confidence: r.confidence,
                    evidence: r.evidence,
                };
                yield {
                    event: {
                        type: "relation_found",
                        timestamp: new Date().toISOString(),
                        data: { relationId: relation.id, type: relation.type },
                    },
                    relation,
                };
            }
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
    flattenNodes(node, result = []) {
        result.push({
            id: node.id || `node-${result.length}`,
            title: node.title,
            pageStart: node.pageStart || 1,
            pageEnd: node.pageEnd || node.pageStart || 1,
        });
        for (const child of node.children || []) {
            this.flattenNodes(child, result);
        }
        return result;
    }
}
//# sourceMappingURL=relation-extractor.js.map