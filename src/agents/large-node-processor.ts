import { type LanguageModel, generateText, Output } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";

export interface LargeNodeOptions {
  maxPagesPerNode: number;
  maxTokensPerNode: number;
  model: LanguageModel;
}

const DEFAULT_OPTIONS: Partial<LargeNodeOptions> = {
  maxPagesPerNode: 15,
  maxTokensPerNode: 20000,
};

/**
 * Estimate token count from text (rough approximation)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate token count for a node's page range
 */
function getNodeTokenCount(node: TreeNode, pages: Page[]): number {
  const start = node.pageStart ?? 1;
  const end = node.pageEnd ?? start;

  let tokens = 0;
  for (const page of pages) {
    if (page.pageNumber >= start && page.pageNumber <= end) {
      tokens += estimateTokens(page.content);
    }
  }
  return tokens;
}

/**
 * Check if a node is "large" and should be split
 */
function isLargeNode(
  node: TreeNode,
  pages: Page[],
  options: LargeNodeOptions,
): boolean {
  const start = node.pageStart ?? 1;
  const end = node.pageEnd ?? start;
  const pageCount = end - start + 1;

  if (pageCount <= options.maxPagesPerNode) {
    return false;
  }
  const tokenCount = getNodeTokenCount(node, pages);
  return tokenCount >= options.maxTokensPerNode;
}

const SubstructureSchema = z.object({
  sections: z.array(
    z.object({
      structure: z.string().describe("Hierarchical index like 1.1, 1.2, 2.1.1"),
      title: z.string().describe("Section title from the text"),
      pageStart: z.number().int().describe("Page where this section starts"),
    }),
  ),
});

/**
 * Extract substructure from a large node's pages.
 * Implements process_large_node_recursively from original PageIndex.
 */
async function extractSubstructure(
  model: LanguageModel,
  node: TreeNode,
  pages: Page[],
): Promise<Array<{ title: string; pageStart: number }>> {
  const start = node.pageStart ?? 1;
  const end = node.pageEnd ?? start;

  // Get pages for this node
  const nodePages = pages.filter(
    (p) => p.pageNumber >= start && p.pageNumber <= end,
  );

  // Build content with page markers (like original PageIndex)
  const content = nodePages
    .map(
      (p) =>
        `<physical_index_${p.pageNumber}>\n${p.content.slice(0, 2000)}\n<physical_index_${p.pageNumber}>`,
    )
    .join("\n\n");

  const jsonExample = `{
  "sections": [
    {"structure": "1.1", "title": "Introduction", "pageStart": 5},
    {"structure": "1.2", "title": "Background", "pageStart": 8},
    {"structure": "1.3", "title": "Methods", "pageStart": 12}
  ]
}`;

  const { output } = await generateText({
    model: model as any,
    output: Output.object({ schema: SubstructureSchema }),
    prompt: `Extract subsections from this document portion.
The text contains <physical_index_X> tags marking page boundaries.

Parent section: "${node.title}" (pages ${start}-${end})

Document content:
${content}

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object with all subsections and their starting page numbers.`,
  });

  if (!output) {
    return [];
  }

  return output.sections.map((s) => ({
    title: s.title,
    pageStart: s.pageStart,
  }));
}

/**
 * Process a potentially large node, splitting it recursively if needed.
 * This is the TypeScript equivalent of process_large_node_recursively.
 */
export async function* processLargeNode(
  node: TreeNode,
  pages: Page[],
  options: LargeNodeOptions,
): AsyncGenerator<{
  event: SSEEvent;
  updatedNode?: TreeNode;
}> {
  const timestamp = () => new Date().toISOString();

  if (!isLargeNode(node, pages, options)) {
    yield {
      event: {
        type: "progress",
        timestamp: timestamp(),
        data: {
          step: "large_node_check",
          node: node.title,
          isLarge: false,
        },
      },
    };
    return;
  }

  const start = node.pageStart ?? 1;
  const end = node.pageEnd ?? start;
  const pageCount = end - start + 1;
  const tokenCount = getNodeTokenCount(node, pages);

  yield {
    event: {
      type: "started",
      timestamp: timestamp(),
      data: {
        step: "split_large_node",
        node: node.title,
        pageCount,
        tokenCount,
      },
    },
  };

  // Extract substructure
  const subsections = await extractSubstructure(options.model, node, pages);

  if (subsections.length === 0) {
    yield {
      event: {
        type: "progress",
        timestamp: timestamp(),
        data: {
          step: "split_large_node",
          node: node.title,
          result: "no_subsections_found",
        },
      },
    };
    return;
  }

  // Check if first subsection matches parent title (skip if so, like original)
  const firstSection = subsections[0];
  let sectionsToAdd = subsections;
  if (
    firstSection &&
    firstSection.title.trim().toLowerCase() === node.title.trim().toLowerCase()
  ) {
    sectionsToAdd = subsections.slice(1);
  }

  if (sectionsToAdd.length === 0) {
    return;
  }

  // Convert to child nodes
  const newChildren: TreeNode[] = [];
  for (let i = 0; i < sectionsToAdd.length; i++) {
    const section = sectionsToAdd[i];
    if (!section) continue;

    const nextSection = sectionsToAdd[i + 1];

    const childNode: TreeNode = {
      id: randomUUID(),
      title: section.title,
      level: node.level + 1,
      pageStart: section.pageStart,
      pageEnd: nextSection ? nextSection.pageStart - 1 : end,
    };

    newChildren.push(childNode);
  }

  // Update parent node's end page to first child's start
  const firstChild = newChildren[0];
  if (firstChild && firstChild.pageStart !== undefined) {
    node.pageEnd = firstChild.pageStart - 1;
  }

  // Merge with existing children or replace
  if (node.children && node.children.length > 0) {
    node.children = [...node.children, ...newChildren];
  } else {
    node.children = newChildren;
  }

  yield {
    event: {
      type: "progress",
      timestamp: timestamp(),
      data: {
        step: "split_large_node",
        node: node.title,
        newChildrenCount: newChildren.length,
      },
    },
    updatedNode: node,
  };

  // Recursively process new children
  for (const child of newChildren) {
    for await (const result of processLargeNode(child, pages, options)) {
      yield result;
    }
  }
}

/**
 * Process all large nodes in the tree recursively.
 * Main entry point for large node processing.
 */
export async function* processLargeNodesInTree(
  tree: TreeNode,
  pages: Page[],
  options: Partial<LargeNodeOptions> & { model: LanguageModel },
): AsyncGenerator<{
  event: SSEEvent;
  tree?: TreeNode;
}> {
  const timestamp = () => new Date().toISOString();
  const fullOptions: LargeNodeOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as LargeNodeOptions;

  yield {
    event: {
      type: "started",
      timestamp: timestamp(),
      data: {
        step: "process_large_nodes",
        maxPagesPerNode: fullOptions.maxPagesPerNode,
        maxTokensPerNode: fullOptions.maxTokensPerNode,
      },
    },
  };

  // Process root's children
  if (tree.children) {
    for (const child of tree.children) {
      for await (const result of processLargeNode(child, pages, fullOptions)) {
        yield { event: result.event };
      }
    }
  }

  yield {
    event: {
      type: "completed",
      timestamp: timestamp(),
      data: {
        step: "process_large_nodes",
      },
    },
    tree,
  };
}
