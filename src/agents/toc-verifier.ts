import { type LanguageModel } from "ai";
import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
import {
  batchVerifyTitlesOnPages,
  batchVerifyTitlesAtStart,
  type VerifyRequest,
  type VerificationResult,
} from "./toc-verifier/index.js";

// Re-export submodules
export {
  verifyTitleOnPage,
  verifyTitleAtPageStart,
} from "./toc-verifier/index.js";
export {
  batchVerifyTitlesOnPages,
  batchVerifyTitlesAtStart,
} from "./toc-verifier/index.js";
export { fixNodePageIndex, fixIncorrectNodes } from "./toc-verifier/index.js";
export type { VerificationResult } from "./toc-verifier/index.js";

/**
 * Verify all nodes in the tree structure against actual page content.
 * OPTIMIZED: Uses batch verification (1 LLM call instead of N calls).
 */
export async function* verifyTreeStructure(
  model: LanguageModel,
  tree: TreeNode,
  pages: Page[],
  options: {
    sampleSize?: number;
    checkPageStart?: boolean;
  } = {},
): AsyncGenerator<{
  event: SSEEvent;
  result?: VerificationResult;
  summary?: {
    accuracy: number;
    verified: number;
    failed: number;
    incorrectNodes: VerificationResult[];
  };
}> {
  const timestamp = () => new Date().toISOString();
  const pageMap = new Map<number, string>();
  for (const page of pages) {
    pageMap.set(page.pageNumber, page.content);
  }

  // Collect all nodes to verify
  const nodesToVerify: { node: TreeNode; depth: number }[] = [];
  function collectNodes(node: TreeNode, depth = 0) {
    nodesToVerify.push({ node, depth });
    if (node.children) {
      for (const child of node.children) {
        collectNodes(child, depth + 1);
      }
    }
  }
  collectNodes(tree);

  // Filter to only nodes with valid page ranges (skip root)
  const verifiableNodes = nodesToVerify.filter(
    ({ node, depth }) =>
      depth > 0 && node.pageStart !== undefined && node.pageStart > 0,
  );

  // Sample if requested
  let toVerify = verifiableNodes;
  if (options.sampleSize && options.sampleSize < verifiableNodes.length) {
    const indices = new Set<number>();
    while (indices.size < options.sampleSize) {
      indices.add(Math.floor(Math.random() * verifiableNodes.length));
    }
    toVerify = Array.from(indices)
      .map((i) => verifiableNodes[i])
      .filter(
        (item): item is { node: TreeNode; depth: number } => item !== undefined,
      );
  }

  yield {
    event: {
      type: "started",
      timestamp: timestamp(),
      data: {
        step: "toc_verification",
        totalNodes: toVerify.length,
        optimized: true, // Flag indicating batch verification
      },
    },
  };

  // Build batch verification requests
  const verifyRequests: VerifyRequest[] = [];
  const nodeIndexMap = new Map<number, { node: TreeNode; depth: number }>();

  for (let i = 0; i < toVerify.length; i++) {
    const item = toVerify[i];
    if (!item) continue;

    const { node } = item;
    const nodePageStart = node.pageStart ?? 1;
    const pageContent = pageMap.get(nodePageStart);

    if (pageContent) {
      verifyRequests.push({
        title: node.title,
        pageContent,
        pageNumber: nodePageStart,
      });
      nodeIndexMap.set(verifyRequests.length - 1, item);
    }
  }

  // BATCH VERIFICATION: Single LLM call for all nodes
  yield {
    event: {
      type: "progress",
      timestamp: timestamp(),
      data: {
        step: "toc_verification",
        message: `Verifying ${verifyRequests.length} nodes in batch...`,
      },
    },
  };

  const batchResults = await batchVerifyTitlesOnPages(model, verifyRequests);

  // Optionally verify start positions in a second batch call
  let startResults = new Map<number, boolean>();
  if (options.checkPageStart) {
    const appearedRequests = verifyRequests.filter(
      (_, i) => batchResults[i]?.appears,
    );
    if (appearedRequests.length > 0) {
      startResults = await batchVerifyTitlesAtStart(model, appearedRequests);
    }
  }

  // Process results
  const results: VerificationResult[] = [];
  const incorrectNodes: VerificationResult[] = [];

  for (let i = 0; i < batchResults.length; i++) {
    const batchResult = batchResults[i];
    const nodeItem = nodeIndexMap.get(i);
    if (!batchResult || !nodeItem) continue;

    const { node } = nodeItem;
    const result: VerificationResult = {
      nodeId: node.id ?? "",
      title: node.title,
      pageStart: batchResult.pageNumber,
      verified: batchResult.appears,
      confidence: batchResult.confidence,
    };

    if (options.checkPageStart && batchResult.appears) {
      result.appearsAtStart = startResults.get(batchResult.pageNumber) ?? false;
    }

    results.push(result);
    if (!batchResult.appears) {
      incorrectNodes.push(result);
    }

    yield {
      event: {
        type: "progress",
        timestamp: timestamp(),
        data: {
          step: "toc_verification",
          progress: ((i + 1) / batchResults.length) * 100,
          currentNode: node.title,
          verified: batchResult.appears,
        },
      },
      result,
    };
  }

  // Add results for nodes without page content
  for (const item of toVerify) {
    if (!item) continue;
    const { node } = item;
    const nodePageStart = node.pageStart ?? 1;
    const pageContent = pageMap.get(nodePageStart);

    if (!pageContent) {
      const result: VerificationResult = {
        nodeId: node.id ?? "",
        title: node.title,
        pageStart: nodePageStart,
        verified: false,
        confidence: 0,
      };
      results.push(result);
      incorrectNodes.push(result);
    }
  }

  const accuracy =
    results.length > 0
      ? results.filter((r) => r.verified).length / results.length
      : 0;

  yield {
    event: {
      type: "completed",
      timestamp: timestamp(),
      data: {
        step: "toc_verification",
        accuracy: Math.round(accuracy * 100),
        verified: results.filter((r) => r.verified).length,
        failed: incorrectNodes.length,
        llmCalls: options.checkPageStart ? 2 : 1, // Log optimization
      },
    },
    summary: {
      accuracy,
      verified: results.filter((r) => r.verified).length,
      failed: incorrectNodes.length,
      incorrectNodes,
    },
  };
}
