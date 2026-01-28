import { type LanguageModel, generateText, Output } from "ai";
import { z } from "zod";
import type { Page } from "../../ports/index.js";
import type { TreeNode, SSEEvent } from "../../domain/schemas.js";
import type { VerificationResult } from "./types";
import { verifyTitleOnPage } from "./verify-title";

const FixPageIndexSchema = z.object({
  thinking: z
    .string()
    .describe("Explain which page contains the start of this section"),
  physicalIndex: z
    .number()
    .nullable()
    .describe("Page number where the section starts, or null if not found"),
  confidence: z.number().min(0).max(1).describe("Confidence level"),
});

/**
 * Fix incorrect node page indices by searching in a range.
 */
export async function fixNodePageIndex(
  model: LanguageModel,
  title: string,
  pages: Page[],
  searchRange: { start: number; end: number },
): Promise<{ pageNumber: number; confidence: number } | null> {
  const contextParts: string[] = [];
  for (const page of pages) {
    if (
      page.pageNumber >= searchRange.start &&
      page.pageNumber <= searchRange.end
    ) {
      contextParts.push(
        `<physical_index_${page.pageNumber}>\n${page.content.slice(0, 2000)}\n<physical_index_${page.pageNumber}>`,
      );
    }
  }

  const jsonExample = `{
  "thinking": "The section title appears at the start of page 15...",
  "physicalIndex": 15,
  "confidence": 0.9
}`;

  const { output } = await generateText({
    model: model as any,
    output: Output.object({ schema: FixPageIndexSchema }),
    prompt: `Find which page contains the start of the given section.
Pages are marked with <physical_index_X> tags.

Section title: ${title}
Document pages:
${contextParts.join("\n\n")}

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with the physical_index number where this section starts.`,
  });

  if (!output || output.physicalIndex === null) {
    return null;
  }

  return {
    pageNumber: output.physicalIndex,
    confidence: output.confidence,
  };
}

/**
 * Fix all incorrect nodes with automatic retry.
 */
export async function* fixIncorrectNodes(
  model: LanguageModel,
  tree: TreeNode,
  incorrectNodes: VerificationResult[],
  pages: Page[],
  options: {
    maxRetries?: number;
    verifyAfterFix?: boolean;
  } = {},
): AsyncGenerator<{
  event: SSEEvent;
  fixedNode?: { nodeId: string; oldPage: number; newPage: number };
  summary?: {
    fixed: number;
    stillIncorrect: number;
    attempts: number;
  };
}> {
  const timestamp = () => new Date().toISOString();
  const maxRetries = options.maxRetries ?? 3;

  // Build node map for quick lookup
  const nodeMap = new Map<string, TreeNode>();
  function buildMap(node: TreeNode) {
    if (node.id) {
      nodeMap.set(node.id, node);
    }
    if (node.children) {
      for (const child of node.children) {
        buildMap(child);
      }
    }
  }
  buildMap(tree);

  // Get all nodes in order for finding neighbors
  const allNodes: TreeNode[] = [];
  function collectAll(node: TreeNode) {
    allNodes.push(node);
    if (node.children) {
      for (const child of node.children) {
        collectAll(child);
      }
    }
  }
  collectAll(tree);

  yield {
    event: {
      type: "started",
      timestamp: timestamp(),
      data: {
        step: "toc_fix",
        incorrectCount: incorrectNodes.length,
        maxRetries,
      },
    },
  };

  let currentIncorrect = [...incorrectNodes];
  let attempt = 0;
  let totalFixed = 0;

  while (currentIncorrect.length > 0 && attempt < maxRetries) {
    attempt++;

    yield {
      event: {
        type: "progress",
        timestamp: timestamp(),
        data: {
          step: "toc_fix",
          attempt,
          remaining: currentIncorrect.length,
        },
      },
    };

    const stillIncorrect: VerificationResult[] = [];

    for (const incorrectResult of currentIncorrect) {
      const node = nodeMap.get(incorrectResult.nodeId);
      if (!node) continue;

      // Find search range from neighbors
      const nodeIndex = allNodes.findIndex((n) => n.id === node.id);

      let prevCorrectPage = 1;
      for (let i = nodeIndex - 1; i >= 0; i--) {
        const prev = allNodes[i];
        if (prev) {
          const prevPageStart = prev.pageStart ?? 0;
          if (
            !currentIncorrect.some((inc) => inc.nodeId === prev.id) &&
            prevPageStart > 0
          ) {
            prevCorrectPage = prevPageStart;
            break;
          }
        }
      }

      let nextCorrectPage = pages.length;
      for (let i = nodeIndex + 1; i < allNodes.length; i++) {
        const next = allNodes[i];
        if (next) {
          const nextPageStart = next.pageStart ?? 0;
          if (
            !currentIncorrect.some((inc) => inc.nodeId === next.id) &&
            nextPageStart > 0
          ) {
            nextCorrectPage = nextPageStart;
            break;
          }
        }
      }

      const fixResult = await fixNodePageIndex(model, node.title, pages, {
        start: prevCorrectPage,
        end: nextCorrectPage,
      });

      if (fixResult && fixResult.confidence > 0.5) {
        const oldPage = node.pageStart ?? 0;
        node.pageStart = fixResult.pageNumber;
        totalFixed++;

        yield {
          event: {
            type: "progress",
            timestamp: timestamp(),
            data: {
              step: "toc_fix",
              fixed: node.title,
              oldPage,
              newPage: fixResult.pageNumber,
            },
          },
          fixedNode: {
            nodeId: node.id ?? "",
            oldPage,
            newPage: fixResult.pageNumber,
          },
        };

        // Optionally verify the fix
        if (options.verifyAfterFix) {
          const pageContent = pages.find(
            (p) => p.pageNumber === fixResult.pageNumber,
          )?.content;
          if (pageContent) {
            const verification = await verifyTitleOnPage(
              model,
              node.title,
              pageContent,
            );
            if (!verification.appears) {
              stillIncorrect.push(incorrectResult);
            }
          }
        }
      } else {
        stillIncorrect.push(incorrectResult);
      }
    }

    currentIncorrect = stillIncorrect;
  }

  yield {
    event: {
      type: "completed",
      timestamp: timestamp(),
      data: {
        step: "toc_fix",
        fixed: totalFixed,
        stillIncorrect: currentIncorrect.length,
        attempts: attempt,
      },
    },
    summary: {
      fixed: totalFixed,
      stillIncorrect: currentIncorrect.length,
      attempts: attempt,
    },
  };
}
