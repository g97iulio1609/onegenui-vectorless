import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { KeywordExtractorPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Keyword } from "../domain/schemas.js";

const KeywordExtractionSchema = z.object({
  keywords: z.array(
    z.object({
      term: z.string(),
      frequency: z.number().int().min(1),
      isGlobal: z.boolean(),
    }),
  ),
});

const jsonExample = `{
  "keywords": [
    {"term": "machine learning", "frequency": 15, "isGlobal": true},
    {"term": "neural network", "frequency": 8, "isGlobal": true},
    {"term": "backpropagation", "frequency": 5, "isGlobal": false}
  ]
}`;

export class KeywordExtractorAgent implements KeywordExtractorPort {
  constructor(private model: LanguageModel) {}

  async *extractKeywords(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{ event: SSEEvent; keyword?: Keyword }> {
    yield {
      event: {
        type: "started",
        timestamp: new Date().toISOString(),
        data: { phase: "keyword_extraction" },
      },
    };

    // Collect all text and node mappings
    const allText = pages.map((p) => p.content).join("\n");
    const nodeTexts = this.collectNodeTexts(tree, pages);

    try {
      const { output } = await generateText({
        model: this.model,
        output: Output.object({ schema: KeywordExtractionSchema }),
        prompt: `Extract the most important keywords and terms from this document.

TEXT (sample):
${allText.slice(0, 6000)}

For each keyword:
- Identify the term
- Estimate frequency (how many times it appears conceptually)
- Mark as global if it's central to the entire document

Extract 20-50 keywords covering main concepts, technical terms, and key themes.

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with keywords.`,
      });

      if (!output) return;

      let keywordId = 0;
      for (const k of output.keywords) {
        // Find which nodes contain this keyword
        const nodeIds = nodeTexts
          .filter(({ text }) =>
            text.toLowerCase().includes(k.term.toLowerCase()),
          )
          .map(({ nodeId }) => nodeId);

        const keyword: Keyword = {
          id: `keyword-${++keywordId}`,
          term: k.term,
          frequency: k.frequency,
          nodeIds,
          isGlobal: k.isGlobal,
        };

        yield {
          event: {
            type: "keyword_extracted",
            timestamp: new Date().toISOString(),
            data: { keywordId: keyword.id, term: keyword.term },
          },
          keyword,
        };
      }
    } catch (error) {
      yield {
        event: {
          type: "error",
          timestamp: new Date().toISOString(),
          data: { error: String(error) },
        },
      };
    }
  }

  private collectNodeTexts(
    node: TreeNode,
    pages: Page[],
    result: { nodeId: string; text: string }[] = [],
  ): { nodeId: string; text: string }[] {
    const nodeId = node.id || `node-${result.length}`;
    const pageStart = node.pageStart || 1;
    const pageEnd = node.pageEnd || pageStart;

    const text = pages
      .filter((p) => p.pageNumber >= pageStart && p.pageNumber <= pageEnd)
      .map((p) => p.content)
      .join("\n");

    result.push({ nodeId, text });

    for (const child of node.children || []) {
      this.collectNodeTexts(child, pages, result);
    }

    return result;
  }
}
