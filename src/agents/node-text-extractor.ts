import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";

/**
 * Add text content from pages to each node.
 * Implements add_node_text from original PageIndex.
 */
export function addNodeText(tree: TreeNode, pages: Page[]): void {
  const pageMap = new Map<number, string>();
  for (const page of pages) {
    pageMap.set(page.pageNumber, page.content);
  }

  function processNode(node: TreeNode) {
    const start = node.pageStart ?? 1;
    const end = node.pageEnd ?? start;

    const textParts: string[] = [];
    for (let i = start; i <= end; i++) {
      const content = pageMap.get(i);
      if (content) {
        textParts.push(content);
      }
    }
    node.text = textParts.join("\n\n");

    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  processNode(tree);
}

/**
 * Remove text from structure (for when we only needed it temporarily for summarization).
 * Implements remove_structure_text from original PageIndex.
 */
export function removeNodeText(tree: TreeNode): void {
  function processNode(node: TreeNode) {
    delete node.text;
    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }
  processNode(tree);
}

/**
 * Get text for a specific node without modifying the tree.
 */
export function getNodeText(node: TreeNode, pages: Page[]): string {
  const start = node.pageStart ?? 1;
  const end = node.pageEnd ?? start;

  const textParts: string[] = [];
  for (const page of pages) {
    if (page.pageNumber >= start && page.pageNumber <= end) {
      textParts.push(page.content);
    }
  }
  return textParts.join("\n\n");
}

/**
 * Add text to nodes with streaming progress events.
 */
export async function* addNodeTextWithProgress(
  tree: TreeNode,
  pages: Page[],
): AsyncGenerator<{
  event: SSEEvent;
  tree?: TreeNode;
}> {
  const timestamp = () => new Date().toISOString();
  const pageMap = new Map<number, string>();
  for (const page of pages) {
    pageMap.set(page.pageNumber, page.content);
  }

  let totalNodes = 0;
  let processedNodes = 0;

  function countNodes(node: TreeNode) {
    totalNodes++;
    if (node.children) {
      for (const child of node.children) {
        countNodes(child);
      }
    }
  }
  countNodes(tree);

  yield {
    event: {
      type: "started",
      timestamp: timestamp(),
      data: {
        step: "add_node_text",
        totalNodes,
      },
    },
  };

  function processNode(node: TreeNode) {
    const start = node.pageStart ?? 1;
    const end = node.pageEnd ?? start;

    const textParts: string[] = [];
    for (let i = start; i <= end; i++) {
      const content = pageMap.get(i);
      if (content) {
        textParts.push(content);
      }
    }
    node.text = textParts.join("\n\n");
    processedNodes++;

    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  processNode(tree);

  yield {
    event: {
      type: "completed",
      timestamp: timestamp(),
      data: {
        step: "add_node_text",
        processedNodes,
      },
    },
    tree,
  };
}

/**
 * Validate and truncate physical indices that exceed document length.
 * Implements validate_and_truncate_physical_indices from original PageIndex.
 */
export function validateNodePageRanges(
  tree: TreeNode,
  totalPages: number,
): { truncated: number; invalidNodes: string[] } {
  const invalidNodes: string[] = [];
  let truncated = 0;

  function processNode(node: TreeNode) {
    const start = node.pageStart;
    const end = node.pageEnd;

    if (start !== undefined && start > totalPages) {
      invalidNodes.push(node.title);
      node.pageStart = totalPages;
      truncated++;
    }

    if (end !== undefined && end > totalPages) {
      node.pageEnd = totalPages;
      truncated++;
    }

    if (
      node.pageStart !== undefined &&
      node.pageEnd !== undefined &&
      node.pageStart > node.pageEnd
    ) {
      node.pageEnd = node.pageStart;
    }

    if (node.children) {
      for (const child of node.children) {
        processNode(child);
      }
    }
  }

  processNode(tree);

  return { truncated, invalidNodes };
}

/**
 * Add a preface/introduction node if the first content doesn't start on page 1.
 * Implements add_preface_if_needed from original PageIndex.
 */
export function addPrefaceIfNeeded(tree: TreeNode): boolean {
  if (!tree.children || tree.children.length === 0) {
    return false;
  }

  const firstChild = tree.children[0];
  if (!firstChild) {
    return false;
  }

  const firstPageStart = firstChild.pageStart ?? 1;

  if (firstPageStart > 1) {
    const prefaceNode: TreeNode = {
      id: `preface-${Date.now()}`,
      title: "Preface / Introduction",
      level: 1,
      pageStart: 1,
      pageEnd: firstPageStart - 1,
    };

    tree.children.unshift(prefaceNode);
    return true;
  }

  return false;
}
