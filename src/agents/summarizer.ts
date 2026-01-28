import {
  ToolLoopAgent,
  tool,
  stepCountIs,
  Output,
  NoObjectGeneratedError,
  type LanguageModel,
} from "ai";
import { z } from "zod";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
import type { Page, SummarizerPort } from "../ports/index.js";

const SummaryOutputSchema = z.object({
  summary: z.string().describe("Concise summary of the content"),
});

const DescriptionOutputSchema = z.object({
  description: z.string().describe("Document description"),
});

export function createSummarizerAgent(model: LanguageModel): SummarizerPort {
  function collectNodes(tree: TreeNode): TreeNode[] {
    const nodes: TreeNode[] = [tree];
    if (tree.children) {
      for (const child of tree.children) {
        nodes.push(...collectNodes(child));
      }
    }
    return nodes;
  }

  function getContentForNode(node: TreeNode, pages: Page[]): string {
    if (node.content) return node.content;
    if (!node.pageStart || !node.pageEnd) return "";

    return pages
      .filter(
        (p) => p.pageNumber >= node.pageStart! && p.pageNumber <= node.pageEnd!,
      )
      .map((p) => p.content)
      .join("\n");
  }

  return {
    async *generateSummaries(tree: TreeNode, pages: Page[]) {
      const timestamp = () => new Date().toISOString();
      const nodes = collectNodes(tree);

      yield {
        event: {
          type: "started",
          timestamp: timestamp(),
          data: { step: "summarization", totalNodes: nodes.length },
        } satisfies SSEEvent,
      };

      // Create summary agent
      const summaryAgent = new ToolLoopAgent({
        model: model as any,
        instructions: `You are an expert at summarizing document sections.
Create concise, informative summaries that capture the key points.
Keep summaries between 1-3 sentences.`,
        output: Output.object({ schema: SummaryOutputSchema }),
        tools: {
          getSectionContent: tool({
            description: "Get the full content of a section to summarize",
            inputSchema: z.object({
              sectionTitle: z.string().describe("Title of the section"),
            }),
            execute: async ({ sectionTitle }) => {
              const node = nodes.find((n) => n.title === sectionTitle);
              if (!node) {
                return { error: `Section "${sectionTitle}" not found` };
              }
              const content = getContentForNode(node, pages);
              return {
                title: sectionTitle,
                content: content.slice(0, 4000),
              };
            },
          }),
        },
        stopWhen: stepCountIs(3),
      });

      let processed = 0;
      for (const node of nodes) {
        const content = getContentForNode(node, pages);
        if (!content || content.length < 100) {
          processed++;
          continue;
        }

        const stream = await summaryAgent.stream({
          prompt: `Summarize the following section titled "${node.title}":\n\n${content.slice(0, 4000)}`,
        });

        // Consume stream and collect raw text for debugging
        let rawText = "";
        for await (const chunk of stream.textStream) {
          rawText += chunk;
        }

        let result;
        try {
          result = await stream.output;
        } catch (error) {
          if (NoObjectGeneratedError.isInstance(error)) {
            console.error(
              `[summarizer] Schema validation failed for "${node.title}":`,
              {
                rawText: error.text?.slice(0, 500),
                cause: error.cause,
                collectedText: rawText.slice(0, 500),
              },
            );
          }
          throw error;
        }
        const nodeId = node.id ?? `node-${processed}`;

        yield {
          event: {
            type: "summary_generated",
            timestamp: timestamp(),
            data: {
              nodeId,
              title: node.title,
              progress: processed + 1,
              total: nodes.length,
            },
          } satisfies SSEEvent,
          nodeId,
          summary: result.summary,
        };

        processed++;
      }
    },

    async generateDocumentDescription(tree: TreeNode): Promise<string> {
      const descriptionAgent = new ToolLoopAgent({
        model: model as any,
        instructions: `You are an expert at describing documents.
Based on the document structure, provide a comprehensive description that includes:
- What type of document this is
- Main topics covered
- Target audience
- Key takeaways`,
        output: Output.object({ schema: DescriptionOutputSchema }),
        tools: {
          getDocumentOverview: tool({
            description: "Get an overview of the document structure",
            inputSchema: z.object({}),
            execute: async () => {
              return {
                title: tree.title,
                sectionCount: tree.children?.length ?? 0,
                sections: tree.children?.map((c) => c.title) ?? [],
              };
            },
          }),
        },
        stopWhen: stepCountIs(2),
      });

      const structureOverview = JSON.stringify(
        {
          title: tree.title,
          children: tree.children?.map((c) => ({
            title: c.title,
            children: c.children?.map((gc) => gc.title),
          })),
        },
        null,
        2,
      );

      const stream = await descriptionAgent.stream({
        prompt: `Based on this document structure, generate a description:\n\n${structureOverview}`,
      });

      // Consume stream and collect raw text for debugging
      let rawText = "";
      for await (const chunk of stream.textStream) {
        rawText += chunk;
      }

      let result;
      try {
        result = await stream.output;
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
          console.error(`[summarizer] Description schema validation failed:`, {
            rawText: error.text?.slice(0, 500),
            cause: error.cause,
            collectedText: rawText.slice(0, 500),
          });
        }
        throw error;
      }
      return result.description;
    },
  };
}
