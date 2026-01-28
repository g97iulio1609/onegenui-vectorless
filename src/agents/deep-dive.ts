import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { DeepDivePort, Page } from "../ports/index.js";
import type {
  DocumentKnowledgeBase,
  SSEEvent,
  KnowledgeNode,
} from "../domain/schemas.js";

const DeepDiveSchema = z.object({
  detailedSummary: z.string(),
  additionalKeyPoints: z.array(z.string()),
  additionalQuotes: z.array(
    z.object({
      text: z.string(),
      significance: z.enum(["key", "supporting", "notable"]),
    }),
  ),
  relatedTopics: z.array(z.string()),
  questions: z.array(z.string()),
});

const jsonExample = `{
  "detailedSummary": "This section covers the methodology used...",
  "additionalKeyPoints": ["Key point 1", "Key point 2"],
  "additionalQuotes": [{"text": "Important quote", "significance": "key"}],
  "relatedTopics": ["Related topic 1", "Related topic 2"],
  "questions": ["What about X?", "How does Y relate?"]
}`;

export class DeepDiveAgent implements DeepDivePort {
  constructor(private model: LanguageModel) {}

  async *deepDive(
    nodeId: string,
    knowledgeBase: DocumentKnowledgeBase,
    pages: Page[],
  ): AsyncGenerator<{ event: SSEEvent; node?: KnowledgeNode }> {
    yield {
      event: {
        type: "started",
        timestamp: new Date().toISOString(),
        data: { phase: "deep_dive", nodeId },
      },
    };

    // Find the target node
    const targetNode = this.findNode(knowledgeBase.tree, nodeId);
    if (!targetNode) {
      yield {
        event: {
          type: "error",
          timestamp: new Date().toISOString(),
          data: { error: `Node ${nodeId} not found` },
        },
      };
      return;
    }

    // Get full text for the node's pages
    const nodeText = pages
      .filter(
        (p) =>
          p.pageNumber >= targetNode.pageStart &&
          p.pageNumber <= targetNode.pageEnd,
      )
      .map((p) => p.content)
      .join("\n");

    try {
      const { output } = await generateText({
        model: this.model,
        output: Output.object({ schema: DeepDiveSchema }),
        prompt: `Perform a deep dive analysis of this document section.

SECTION: ${targetNode.title}
PAGES: ${targetNode.pageStart}-${targetNode.pageEnd}
CURRENT SUMMARY: ${targetNode.summary}

FULL TEXT:
${nodeText.slice(0, 8000)}

Provide:
1. A detailed summary (2-3 paragraphs)
2. Additional key points not in the current summary
3. Notable quotes from this section
4. Related topics for further exploration
5. Questions this section raises

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object.`,
      });

      if (!output) {
        yield {
          event: {
            type: "error",
            timestamp: new Date().toISOString(),
            data: { error: "Failed to generate deep dive" },
          },
        };
        return;
      }

      const enhancedNode: KnowledgeNode = {
        ...targetNode,
        detailedSummary: output.detailedSummary,
        keyPoints: [...targetNode.keyPoints, ...output.additionalKeyPoints],
      };

      yield {
        event: {
          type: "completed",
          timestamp: new Date().toISOString(),
          data: {
            nodeId,
            additionalQuotes: output.additionalQuotes.length,
            relatedTopics: output.relatedTopics,
          },
        },
        node: enhancedNode,
      };
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

  private findNode(
    node: KnowledgeNode,
    targetId: string,
  ): KnowledgeNode | null {
    if (node.id === targetId) return node;

    for (const child of node.children || []) {
      const found = this.findNode(child, targetId);
      if (found) return found;
    }

    return null;
  }
}
