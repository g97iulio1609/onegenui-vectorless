/**
 * Formatters for Vectorless document structures
 *
 * Converts trees, search results, and knowledge bases to text/prompt formats.
 */

import type {
  TreeNode,
  DocumentKnowledgeBase,
  Entity,
  Quote,
} from "vectorless";

import type { AgenticRetrievalResult } from "../agents/agentic-retrieval.js";
import type {
  DocumentReport,
  ReportSection,
} from "../domain/document-report.schema.js";

// Types for search results (shared between packages)
export interface SearchResult {
  nodeId: string;
  title: string;
  content: string;
  relevanceScore: number;
  pageRange: [number, number];
}

// Tree format for outline display
export interface TreeOutlineOptions {
  maxDepth?: number;
  showPages?: boolean;
  showSummaries?: boolean;
}

/**
 * Format search results as plain text
 */
export function formatSearchResultsAsText(results: SearchResult[]): string {
  if (results.length === 0) return "";

  return results
    .map(
      (r) =>
        `--- ${r.title} (pages ${r.pageRange[0]}-${r.pageRange[1]}) ---\n${r.content}`,
    )
    .join("\n\n");
}

/**
 * Format tree as outline for display/prompts
 */
export function formatTreeAsOutline(
  tree: TreeNode,
  options: TreeOutlineOptions = {},
): string {
  const { maxDepth = 3, showPages = true, showSummaries = false } = options;
  const lines: string[] = [];

  function traverse(
    nodes: TreeNode[] | undefined,
    depth: number,
    prefix: string,
  ) {
    if (depth > maxDepth || !nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      const indent = "  ".repeat(depth);
      const pageInfo =
        showPages && node.pageStart
          ? ` (p.${node.pageStart}-${node.pageEnd ?? node.pageStart})`
          : "";
      lines.push(`${indent}${prefix}${node.title}${pageInfo}`);

      if (showSummaries && node.summary) {
        lines.push(`${indent}  ${node.summary}`);
      }

      if (node.children) {
        traverse(node.children, depth + 1, "- ");
      }
    }
  }

  lines.push(`Document: ${tree.title}`);
  if (tree.summary) {
    lines.push(`Description: ${tree.summary}`);
  }
  const totalPages =
    tree.pageEnd ?? tree.children?.[tree.children.length - 1]?.pageEnd ?? 0;
  lines.push(`Pages: ${totalPages}`);
  lines.push("");
  traverse(tree.children, 0, "");

  return lines.join("\n");
}

/**
 * Format entities grouped by type for prompts
 */
export function formatEntitiesForPrompt(entities: Entity[]): string {
  if (entities.length === 0) return "No entities extracted.";

  const byType = entities.reduce(
    (acc, e) => {
      const type = e.type;
      if (!acc[type]) acc[type] = [];
      acc[type]!.push(e);
      return acc;
    },
    {} as Record<string, Entity[]>,
  );

  const sections: string[] = [];
  for (const [type, typeEntities] of Object.entries(byType)) {
    const items = typeEntities
      .slice(0, 10)
      .map((e) => `- ${e.value}${e.description ? `: ${e.description}` : ""}`)
      .join("\n");
    sections.push(`**${type.toUpperCase()}**\n${items}`);
  }

  return sections.join("\n\n");
}

/**
 * Format quotes for prompts, highlighting key quotes
 */
export function formatQuotesForPrompt(quotes: Quote[]): string {
  if (quotes.length === 0) return "No significant quotes found.";

  const keyQuotes = quotes.filter((q) => q.significance === "key");
  const otherQuotes = quotes.filter((q) => q.significance !== "key");

  const lines: string[] = [];

  if (keyQuotes.length > 0) {
    lines.push("**KEY QUOTES:**");
    for (const q of keyQuotes.slice(0, 5)) {
      lines.push(
        `> "${q.text}" (p.${q.pageNumber}${q.speaker ? `, ${q.speaker}` : ""})`,
      );
    }
  }

  if (otherQuotes.length > 0) {
    lines.push("\n**SUPPORTING QUOTES:**");
    for (const q of otherQuotes.slice(0, 5)) {
      lines.push(`> "${q.text}" (p.${q.pageNumber})`);
    }
  }

  return lines.join("\n");
}

/**
 * Format knowledge base for use in prompts
 */
export function formatKnowledgeBaseForPrompt(
  kb: DocumentKnowledgeBase,
): string {
  const lines: string[] = [];

  lines.push(`# ${kb.tree.title}`);
  lines.push(kb.description);
  lines.push("");

  if (kb.keyInsights.length > 0) {
    lines.push("## Key Insights");
    for (const insight of kb.keyInsights) {
      lines.push(`- ${insight}`);
    }
    lines.push("");
  }

  if (kb.entities.length > 0) {
    lines.push("## Extracted Entities");
    lines.push(formatEntitiesForPrompt(kb.entities));
    lines.push("");
  }

  if (kb.quotes.length > 0) {
    lines.push("## Significant Quotes");
    lines.push(formatQuotesForPrompt(kb.quotes));
    lines.push("");
  }

  if (kb.keywords.length > 0) {
    lines.push("## Keywords");
    const topKeywords = kb.keywords
      .slice(0, 15)
      .map((k) => k.term)
      .join(", ");
    lines.push(topKeywords);
    lines.push("");
  }

  if (kb.citations.length > 0) {
    lines.push("## Citations");
    for (const c of kb.citations.slice(0, 10)) {
      lines.push(`- ${c.text} (${c.type}, p.${c.pageNumber})`);
    }
  }

  return lines.join("\n");
}

/**
 * Format search results with full document context
 */
export function formatSearchResultsEnhanced(
  tree: TreeNode,
  results: SearchResult[],
): string {
  const lines: string[] = [];
  const totalPages =
    tree.pageEnd ?? tree.children?.[tree.children.length - 1]?.pageEnd ?? 0;

  // Document header
  lines.push("=".repeat(60));
  lines.push("DOCUMENT ANALYSIS");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Title: ${tree.title}`);
  if (tree.summary) {
    lines.push(`Description: ${tree.summary}`);
  }
  lines.push(`Total Pages: ${totalPages}`);
  lines.push("");

  // Document structure overview
  lines.push("-".repeat(40));
  lines.push("DOCUMENT STRUCTURE");
  lines.push("-".repeat(40));
  lines.push(formatTreeAsOutline(tree, { maxDepth: 2 }));
  lines.push("");

  // Retrieved sections
  if (results.length > 0) {
    lines.push("-".repeat(40));
    lines.push(`RETRIEVED SECTIONS (${results.length} found)`);
    lines.push("-".repeat(40));
    lines.push("");

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r) continue;
      lines.push(`[Section ${i + 1}] ${r.title}`);
      lines.push(
        `Pages: ${r.pageRange[0]}-${r.pageRange[1]} | Relevance: ${(r.relevanceScore * 100).toFixed(0)}%`,
      );
      lines.push("");
      lines.push(r.content);
      lines.push("");
      if (i < results.length - 1) {
        lines.push("---");
        lines.push("");
      }
    }
  } else {
    lines.push("-".repeat(40));
    lines.push("NO SPECIFIC SECTIONS RETRIEVED");
    lines.push("-".repeat(40));
    lines.push("The full document structure is provided above for reference.");
  }

  lines.push("");
  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Format agentic search result for prompts
 */
export function formatAgenticResultForPrompt(
  tree: TreeNode,
  result: AgenticRetrievalResult,
): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`DOCUMENT: ${tree.title}`);
  if (tree.summary) {
    lines.push(`Description: ${tree.summary}`);
  }
  lines.push("=".repeat(60));
  lines.push("");

  lines.push("ANSWER:");
  lines.push(result.answer);
  lines.push("");

  if (result.citations.length > 0) {
    lines.push("-".repeat(40));
    lines.push("CITATIONS:");
    lines.push("-".repeat(40));
    for (const cite of result.citations) {
      lines.push(
        `[Page ${cite.pageNumber}${cite.nodeTitle ? ` - ${cite.nodeTitle}` : ""}]`,
      );
      lines.push(`"${cite.excerpt}"`);
      lines.push("");
    }
  }

  if (result.thinking) {
    lines.push("-".repeat(40));
    lines.push("REASONING:");
    lines.push("-".repeat(40));
    lines.push(result.thinking);
  }

  if (result.sectionsRead?.length > 0) {
    lines.push("");
    lines.push(`Sections analyzed: ${result.sectionsRead.join(", ")}`);
  }

  if (result.pagesRead?.length > 0) {
    lines.push(`Pages read: ${result.pagesRead.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Format DocumentReport structured data for LLM prompt context.
 * Includes sections with summaries, entities, timeline, relations,
 * key insights, and quotes - everything the LLM needs to generate
 * rich UI components.
 */
export function formatDocumentReportForPrompt(
  report: DocumentReport,
): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("DOCUMENT DEEP ANALYSIS");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Title: ${report.title}`);
  lines.push(`Description: ${report.description}`);
  lines.push(`Total Pages: ${report.totalPages}`);
  if (report.filename) lines.push(`File: ${report.filename}`);
  lines.push("");

  // Section structure with summaries and key points
  if (report.sections.length > 0) {
    lines.push("-".repeat(40));
    lines.push("DOCUMENT SECTIONS (detailed analysis)");
    lines.push("-".repeat(40));
    lines.push("");
    for (const section of report.sections) {
      formatSectionForPrompt(section, lines, 0);
    }
  }

  // Semantic overlay data
  const overlay = report.semanticOverlay;
  if (overlay) {
    // Key insights
    if (overlay.keyInsights.length > 0) {
      lines.push("-".repeat(40));
      lines.push("KEY INSIGHTS");
      lines.push("-".repeat(40));
      for (const insight of overlay.keyInsights) {
        lines.push(`- ${insight}`);
      }
      lines.push("");
    }

    // Entities
    if (overlay.topEntities.length > 0) {
      lines.push("-".repeat(40));
      lines.push("EXTRACTED ENTITIES");
      lines.push("-".repeat(40));
      const byType = new Map<string, typeof overlay.topEntities>();
      for (const e of overlay.topEntities) {
        if (!byType.has(e.type)) byType.set(e.type, []);
        byType.get(e.type)!.push(e);
      }
      for (const [type, entities] of byType) {
        lines.push(`\n**${type.toUpperCase()}:**`);
        for (const e of entities.slice(0, 10)) {
          const desc = e.description ? `: ${e.description}` : "";
          lines.push(`  - ${e.value}${desc} (${e.occurrenceCount}x, importance: ${Math.round(e.importance)}%)`);
        }
      }
      lines.push("");
    }

    // Relations
    if (overlay.relations.length > 0) {
      lines.push("-".repeat(40));
      lines.push("RELATIONSHIPS");
      lines.push("-".repeat(40));
      for (const r of overlay.relations) {
        lines.push(`  ${r.sourceTitle} --[${r.type}]--> ${r.targetTitle}`);
        if (r.evidence) lines.push(`    Evidence: ${r.evidence}`);
      }
      lines.push("");
    }

    // Timeline
    if (overlay.timeline && overlay.timeline.length > 0) {
      lines.push("-".repeat(40));
      lines.push("TIMELINE OF EVENTS");
      lines.push("-".repeat(40));
      for (const evt of overlay.timeline) {
        lines.push(`  [${evt.date}] ${evt.event} (p.${evt.pageRef})`);
      }
      lines.push("");
    }

    // Key quotes
    if (overlay.globalQuotes.length > 0) {
      lines.push("-".repeat(40));
      lines.push("KEY QUOTES");
      lines.push("-".repeat(40));
      for (const q of overlay.globalQuotes) {
        const speaker = q.speaker ? ` - ${q.speaker}` : "";
        lines.push(`  > "${q.text}"${speaker}`);
      }
      lines.push("");
    }

    // Concept map
    if (overlay.conceptMap && overlay.conceptMap.length > 0) {
      lines.push("-".repeat(40));
      lines.push("CONCEPT MAP");
      lines.push("-".repeat(40));
      for (const c of overlay.conceptMap) {
        lines.push(`  ${c.concept} --> ${c.relatedConcepts.join(", ")}`);
      }
      lines.push("");
    }
  }

  // Processing stats
  if (report.processingStats) {
    lines.push("-".repeat(40));
    lines.push("ANALYSIS STATS");
    lines.push("-".repeat(40));
    lines.push(`  Sections analyzed: ${report.processingStats.sectionsAnalyzed}`);
    lines.push(`  Entities extracted: ${report.processingStats.entitiesExtracted}`);
    lines.push(`  Relations found: ${report.processingStats.relationsFound}`);
    lines.push("");
  }

  lines.push("=".repeat(60));
  return lines.join("\n");
}

function formatSectionForPrompt(
  section: ReportSection,
  lines: string[],
  depth: number,
): void {
  const indent = "  ".repeat(depth);
  lines.push(`${indent}## ${section.title} (p.${section.pageStart}-${section.pageEnd})`);

  if (section.summary) {
    lines.push(`${indent}   ${section.summary}`);
  }

  if (section.keyPoints.length > 0) {
    for (const point of section.keyPoints) {
      lines.push(`${indent}   - ${point}`);
    }
  }

  if (section.entities.length > 0) {
    const entityLabels = section.entities.map(e => `${e.value} (${e.type})`).join(", ");
    lines.push(`${indent}   Entities: ${entityLabels}`);
  }

  if (section.quotes.length > 0) {
    for (const q of section.quotes) {
      const speaker = q.speaker ? ` - ${q.speaker}` : "";
      lines.push(`${indent}   > "${q.text}"${speaker}`);
    }
  }

  lines.push("");

  if (section.children) {
    for (const child of section.children) {
      formatSectionForPrompt(child, lines, depth + 1);
    }
  }
}
