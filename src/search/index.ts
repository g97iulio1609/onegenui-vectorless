/**
 * Tree Search Module for Vectorless
 *
 * Provides LLM-powered document tree search with dependency injection
 * for model and logger, enabling use in different environments.
 */

import type { LanguageModel } from "ai";
import type { TreeNode } from "vectorless";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Use the SearchResult from formatters for consistency
export type { SearchResult } from "../formatters/index.js";

import type { SearchResult } from "../formatters/index.js";

export interface TreeSearchOptions {
  expertPreferences?: string;
  enableDrillDown?: boolean;
  maxResults?: number;
}

export interface SearchLogger {
  debug(category: string, message: string, data?: Record<string, unknown>): void;
  info(category: string, message: string, data?: Record<string, unknown>): void;
  error(category: string, message: string, error?: unknown): void;
  searchStart?(query: string): void;
  searchComplete?(count: number, method: string): void;
  stepStart?(step: string, data?: Record<string, unknown>): void;
  stepComplete?(step: string, data?: Record<string, unknown>): void;
  llmCallStart?(fn: string, model: string): void;
  llmCallComplete?(fn: string): void;
}

export interface TreeSearchDeps {
  model: LanguageModel;
  logger?: SearchLogger;
}

// ─────────────────────────────────────────────────────────────────────────────
// Silent Logger (default)
// ─────────────────────────────────────────────────────────────────────────────

const silentLogger: SearchLogger = {
  debug: () => {},
  info: () => {},
  error: () => {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function buildNodeMap(nodes: TreeNode[] | undefined): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>();

  function traverse(nodes: TreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.id) map.set(node.id, node);
      if (node.children) traverse(node.children);
    }
  }

  traverse(nodes);
  return map;
}

function countNodes(nodes: TreeNode[] | undefined): { total: number; maxDepth: number } {
  let total = 0;
  let maxDepth = 0;

  function traverse(nodes: TreeNode[] | undefined, depth: number) {
    if (!nodes) return;
    for (const node of nodes) {
      total++;
      maxDepth = Math.max(maxDepth, depth);
      if (node.children) traverse(node.children, depth + 1);
    }
  }

  traverse(nodes, 1);
  return { total, maxDepth };
}

function formatTreeForLLMSearch(tree: TreeNode, expertPreferences?: string): string {
  const lines: string[] = [];

  function traverse(nodes: TreeNode[] | undefined, depth: number) {
    if (!nodes) return;
    for (const node of nodes) {
      const indent = "  ".repeat(depth);
      const summary = node.summary
        ? `\n${indent}  Summary: ${node.summary.slice(0, 300)}${node.summary.length > 300 ? "..." : ""}`
        : "";
      lines.push(
        `${indent}[${node.id ?? ""}] ${node.title} (p.${node.pageStart ?? 0}-${node.pageEnd ?? 0})${summary}`,
      );
      if (node.children) traverse(node.children, depth + 1);
    }
  }

  lines.push(`Document: ${tree.title}`);
  if (tree.summary) lines.push(`Description: ${tree.summary}`);
  lines.push(`Total Pages: ${tree.pageEnd ?? 0}`);

  if (expertPreferences) {
    lines.push("");
    lines.push(`Expert Knowledge: ${expertPreferences}`);
  }

  lines.push("");
  lines.push("Document Structure:");
  traverse(tree.children, 0);

  return lines.join("\n");
}

function keywordSearch(tree: TreeNode, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  function searchNodes(nodes: TreeNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      const titleMatch = node.title.toLowerCase().includes(queryLower);
      const summaryMatch = node.summary?.toLowerCase().includes(queryLower);
      const textMatch = node.text?.toLowerCase().includes(queryLower);

      if (titleMatch || summaryMatch || textMatch) {
        let score = 0;
        if (titleMatch) score += 0.5;
        if (summaryMatch) score += 0.3;
        if (textMatch) score += 0.2;

        results.push({
          nodeId: node.id ?? "",
          title: node.title,
          content: node.text || node.summary || node.title,
          relevanceScore: score,
          pageRange: [node.pageStart ?? 1, node.pageEnd ?? node.pageStart ?? 1],
        });
      }

      searchNodes(node.children);
    }
  }

  searchNodes(tree.children);
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

function mergeSearchResults(
  parentResults: SearchResult[],
  drillDownResults: SearchResult[],
  maxResults: number,
): SearchResult[] {
  const seen = new Set(parentResults.map((r) => r.nodeId));
  const merged = [...parentResults];

  for (const result of drillDownResults) {
    if (!seen.has(result.nodeId)) {
      merged.push(result);
      seen.add(result.nodeId);
    }
  }

  return merged.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxResults);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Search Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search a document tree for relevant sections using LLM.
 *
 * @param tree - The document tree to search (TreeNode format)
 * @param query - The search query
 * @param deps - Dependencies: model (required), logger (optional)
 * @param options - Search options
 */
export async function searchTree(
  tree: TreeNode,
  query: string,
  deps: TreeSearchDeps,
  options: TreeSearchOptions = {},
): Promise<SearchResult[]> {
  const { model, logger = silentLogger } = deps;
  const { expertPreferences, enableDrillDown = false, maxResults = 7 } = options;

  logger.searchStart?.(query);
  logger.stepStart?.("llm-search", {
    documentTitle: tree.title,
    query: query.slice(0, 100),
    hasExpertPreferences: !!expertPreferences,
    enableDrillDown,
  });

  const treeStructure = formatTreeForLLMSearch(tree, expertPreferences);
  logger.debug("SEARCH", "Tree structure prepared for LLM", {
    treeStructureLength: treeStructure.length,
    nodesCount: countNodes(tree.children).total,
  });

  const { streamText, Output } = await import("ai");
  const { z } = await import("zod");

  const SearchResultSchema = z.object({
    thinking: z.string().describe("Step-by-step reasoning about which nodes are relevant"),
    node_list: z.array(z.string()).describe("List of node_ids that contain the answer"),
    confidence: z.enum(["high", "medium", "low"]).describe("Confidence in selected nodes"),
  });

  try {
    logger.llmCallStart?.("searchTree", "model");

    const expertContext = expertPreferences
      ? `\n\nExpert Knowledge to consider:\n${expertPreferences}\n`
      : "";

    const stream = streamText({
      model: model as any,
      output: Output.object({ schema: SearchResultSchema }),
      prompt: `You are an expert document analyst performing reasoning-based retrieval.
Given a query and a document's hierarchical structure, identify the most relevant sections.

Query: ${query}
${expertContext}
Document Structure:
${treeStructure}

Instructions:
1. Analyze the query to understand what information is being requested
2. Examine each node's title and summary to assess relevance
3. Consider the hierarchical structure - parent nodes may contain relevant context
4. Select nodes that are most likely to contain the answer
5. Prioritize specificity over generality when possible

Return:
- Your step-by-step reasoning process
- A list of ${maxResults} or fewer node_ids ranked by relevance
- Your confidence level in the selection`,
    });

    for await (const _chunk of stream.textStream) {
      // Consuming stream
    }

    const result = await stream.output;

    if (!result) {
      throw new Error("Failed to parse LLM response - no structured output");
    }

    logger.llmCallComplete?.("searchTree");
    logger.debug("SEARCH", "LLM reasoning", { thinking: result.thinking });
    logger.debug("SEARCH", "LLM selected nodes", {
      nodeIds: result.node_list,
      confidence: result.confidence,
    });

    // Convert node_ids to search results
    let results: SearchResult[] = [];
    const nodeMap = buildNodeMap(tree.children);

    for (const nodeId of result.node_list) {
      const node = nodeMap.get(nodeId);
      if (node) {
        results.push({
          nodeId: node.id ?? nodeId,
          title: node.title,
          content: node.text || node.summary || node.title,
          relevanceScore: 1.0 - results.length * 0.1,
          pageRange: [node.pageStart ?? 1, node.pageEnd ?? node.pageStart ?? 1],
        });
      }
    }

    // Drill-down if enabled
    if (enableDrillDown && results.length > 0) {
      const drillDownResults = await performDrillDown(results, nodeMap, query, model, logger, expertPreferences);
      if (drillDownResults.length > 0) {
        results = mergeSearchResults(results, drillDownResults, maxResults);
      }
    }

    logger.searchComplete?.(results.length, "llm");
    logger.stepComplete?.("llm-search", {
      resultsCount: results.length,
      confidence: result.confidence,
    });

    return results;
  } catch (error) {
    logger.error("SEARCH", "LLM search failed", error);
    throw error;
  }
}

async function performDrillDown(
  parentResults: SearchResult[],
  nodeMap: Map<string, TreeNode>,
  query: string,
  model: LanguageModel,
  logger: SearchLogger,
  expertPreferences?: string,
): Promise<SearchResult[]> {
  const childNodes: TreeNode[] = [];

  for (const result of parentResults) {
    const node = nodeMap.get(result.nodeId);
    if (node?.children && node.children.length > 0) {
      childNodes.push(...node.children);
    }
  }

  if (childNodes.length === 0) return [];

  logger.debug("SEARCH", "Performing drill-down", { childNodesCount: childNodes.length });

  const { generateText, Output } = await import("ai");
  const { z } = await import("zod");

  const DrillDownSchema = z.object({
    relevant_children: z.array(z.string()).describe("Child node_ids that are most relevant"),
  });

  try {
    const childStructure = childNodes
      .map(
        (n) =>
          `[${n.id ?? ""}] ${n.title} (p.${n.pageStart ?? 0}-${n.pageEnd ?? 0})${n.summary ? ` - ${n.summary.slice(0, 150)}` : ""}`,
      )
      .join("\n");

    const { output: drillResult } = await generateText({
      model: model as any,
      output: Output.object({ schema: DrillDownSchema }),
      prompt: `Select the most relevant child sections for this query.

Query: ${query}
${expertPreferences ? `Expert Knowledge: ${expertPreferences}\n` : ""}
Child Sections:
${childStructure}

Select up to 3 most relevant child sections. Return only the JSON object.`,
    });

    if (!drillResult) return [];

    const results: SearchResult[] = [];
    for (const nodeId of drillResult.relevant_children) {
      const node = childNodes.find((n) => n.id === nodeId);
      if (node) {
        results.push({
          nodeId: node.id ?? nodeId,
          title: node.title,
          content: node.text || node.summary || node.title,
          relevanceScore: 0.95 - results.length * 0.05,
          pageRange: [node.pageStart ?? 1, node.pageEnd ?? node.pageStart ?? 1],
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// Re-export helper for external use
export { keywordSearch, buildNodeMap };
