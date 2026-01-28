import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { QuoteExtractorPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Quote } from "../domain/schemas.js";

const QuoteExtractionSchema = z.object({
  quotes: z.array(
    z.object({
      text: z.string(),
      significance: z.enum(["key", "supporting", "notable"]),
      speaker: z.string().optional(),
      context: z.string().optional(),
    }),
  ),
});

const jsonExample = `{
  "quotes": [
    {"text": "This is a key insight from the document", "significance": "key", "speaker": "Author Name", "context": "In the introduction"},
    {"text": "Supporting evidence for the main argument", "significance": "supporting"}
  ]
}`;

export class QuoteExtractorAgent implements QuoteExtractorPort {
  constructor(private model: LanguageModel) {}

  async *extractQuotes(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{ event: SSEEvent; quote?: Quote }> {
    yield {
      event: {
        type: "started",
        timestamp: new Date().toISOString(),
        data: { phase: "quote_extraction" },
      },
    };

    const nodeTexts = this.collectNodeTexts(tree, pages);
    let quoteId = 0;

    for (const { nodeId, text, pageStart } of nodeTexts) {
      if (!text || text.length < 100) continue;

      try {
        const { output } = await generateText({
          model: this.model,
          output: Output.object({ schema: QuoteExtractionSchema }),
          prompt: `Extract significant quotes from this text. Look for:
- Key insights or conclusions
- Important statements or claims
- Notable phrases or memorable text
- Direct quotations from people

TEXT:
${text.slice(0, 4000)}

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with significant quotes.`,
        });

        if (!output) continue;

        for (const q of output.quotes) {
          const quote: Quote = {
            id: `quote-${++quoteId}`,
            text: q.text,
            pageNumber: pageStart,
            nodeId,
            significance: q.significance,
            speaker: q.speaker,
            context: q.context,
          };

          yield {
            event: {
              type: "quote_extracted",
              timestamp: new Date().toISOString(),
              data: { quoteId: quote.id, significance: quote.significance },
            },
            quote,
          };
        }
      } catch (error) {
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

  private collectNodeTexts(
    node: TreeNode,
    pages: Page[],
    result: { nodeId: string; text: string; pageStart: number }[] = [],
  ): { nodeId: string; text: string; pageStart: number }[] {
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
