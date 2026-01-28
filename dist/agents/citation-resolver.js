import { generateText, Output } from "ai";
import { z } from "zod";
const CitationExtractionSchema = z.object({
    citations: z.array(z.object({
        text: z.string(),
        type: z.enum(["book", "article", "web", "report", "thesis", "other"]),
        authors: z.array(z.string()).optional(),
        title: z.string().optional(),
        year: z.number().optional(),
        source: z.string().optional(),
    })),
});
const jsonExample = `{
  "citations": [
    {"text": "[1] Smith, J. (2020). Machine Learning Basics", "type": "book", "authors": ["Smith, J."], "title": "Machine Learning Basics", "year": 2020},
    {"text": "(Johnson et al., 2019)", "type": "article", "authors": ["Johnson"], "year": 2019}
  ]
}`;
export class CitationResolverAgent {
    model;
    constructor(model) {
        this.model = model;
    }
    async *resolveCitations(pages, tree) {
        yield {
            event: {
                type: "started",
                timestamp: new Date().toISOString(),
                data: { phase: "citation_resolution" },
            },
        };
        const nodeTexts = this.collectNodeTexts(tree, pages);
        let citationId = 0;
        for (const { nodeId, text, pageStart } of nodeTexts) {
            if (!text || text.length < 50)
                continue;
            // Check if text likely contains citations
            const hasCitationPatterns = /\[\d+\]|\(\d{4}\)|et al\.|ibid\.|op\.?\s*cit\./i.test(text);
            if (!hasCitationPatterns)
                continue;
            try {
                const { output } = await generateText({
                    model: this.model,
                    output: Output.object({ schema: CitationExtractionSchema }),
                    prompt: `Extract bibliographic citations from this text.

TEXT:
${text.slice(0, 4000)}

Look for:
- Numbered references like [1], [2]
- Author-year citations like (Smith, 2020)
- Footnote references
- Bibliography entries

For each citation extract the full text and parse components where possible.

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with citations.`,
                });
                if (!output)
                    continue;
                for (const c of output.citations) {
                    const citation = {
                        id: `citation-${++citationId}`,
                        text: c.text,
                        type: c.type,
                        authors: c.authors,
                        title: c.title,
                        year: c.year,
                        source: c.source,
                        pageNumber: pageStart,
                        nodeId,
                    };
                    yield {
                        event: {
                            type: "citation_resolved",
                            timestamp: new Date().toISOString(),
                            data: { citationId: citation.id, type: citation.type },
                        },
                        citation,
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
//# sourceMappingURL=citation-resolver.js.map