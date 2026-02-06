/**
 * DocumentReport Helpers - utilities for report generation
 */
import type { TreeNode, Entity, Quote, Relation } from "../domain/schemas.js";
import type {
  ReportSection,
  AggregatedEntity,
  ReportRelation,
  SectionEntity,
  SectionQuote,
  PageSource,
} from "../domain/document-report.schema.js";
import type { Page } from "../ports/index.js";

export function flattenTree(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node];
  for (const child of node.children || []) {
    result.push(...flattenTree(child));
  }
  return result;
}

export function countSections(sections: ReportSection[]): number {
  return sections.reduce(
    (count, s) => count + 1 + countSections(s.children || []),
    0,
  );
}

export function createSimpleTree(pages: Page[]): TreeNode {
  return {
    id: "root",
    title: "Document",
    level: 0,
    pageStart: 1,
    pageEnd: pages.length,
    children: [],
  };
}

export function extractKeyPoints(summary: string): string[] {
  if (!summary) return [];
  return summary
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 20)
    .slice(0, 5)
    .map((s) => s.trim());
}

export function convertToReportSections(
  node: TreeNode,
  entities: Entity[],
  quotes: Quote[],
): ReportSection[] {
  const nodeId = node.id || `section-${Math.random().toString(36).slice(2)}`;

  const nodeEntities: SectionEntity[] = entities
    .filter((e) => e.occurrences.some((o) => o.nodeId === nodeId))
    .slice(0, 10)
    .map((e) => ({
      type: e.type,
      value: e.value,
      relevance: e.confidence || 0.5,
    }));

  const nodeQuotes: SectionQuote[] = quotes
    .filter((q) => q.nodeId === nodeId)
    .slice(0, 5)
    .map((q) => ({
      text: q.text,
      significance: q.significance,
      speaker: q.speaker,
    }));

  const children = (node.children || []).flatMap((child) =>
    convertToReportSections(child, entities, quotes),
  );

  const section: ReportSection = {
    id: nodeId,
    title: node.title,
    level: node.level,
    pageStart: node.pageStart || 1,
    pageEnd: node.pageEnd || node.pageStart || 1,
    summary: node.summary || "",
    keyPoints: extractKeyPoints(node.summary || ""),
    entities: nodeEntities,
    quotes: nodeQuotes,
    children,
  };

  // For root node (level 0), return children directly.
  // But if root has no children, return the root itself as a section
  // to avoid losing all content.
  if (node.level === 0) {
    return children.length > 0 ? children : (node.summary ? [section] : []);
  }
  return [section];
}

export function aggregateEntities(entities: Entity[]): AggregatedEntity[] {
  const grouped = new Map<string, Entity[]>();
  for (const e of entities) {
    const key = e.value.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return Array.from(grouped.entries())
    .map(([_, group]) => {
      const first = group[0]!;
      const sectionIds = [...new Set(group.flatMap((e) => e.occurrences.map((o) => o.nodeId)))];
      return {
        id: first.id,
        type: first.type,
        value: first.value,
        description: first.description,
        occurrenceCount: group.reduce((sum, e) => sum + e.occurrences.length, 0),
        sectionIds,
        importance: Math.min(100, sectionIds.length * 20 + (first.confidence || 0.5) * 50),
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 30);
}

export function convertRelations(relations: Relation[], tree: TreeNode): ReportRelation[] {
  const nodes = flattenTree(tree);
  const nodeMap = new Map(nodes.map((n) => [n.id, n.title]));

  return relations.slice(0, 20).map((r) => ({
    id: r.id,
    sourceTitle: nodeMap.get(r.sourceNodeId) || r.sourceNodeId,
    targetTitle: nodeMap.get(r.targetNodeId) || r.targetNodeId,
    type: r.type,
    evidence: r.evidence || "",
  }));
}

export function buildSources(sections: ReportSection[]): PageSource[] {
  const sources: PageSource[] = [];

  const addSection = (s: ReportSection) => {
    sources.push({ id: s.id, title: s.title, pageNumber: s.pageStart });
    for (const child of s.children || []) addSection(child);
  };

  for (const section of sections) addSection(section);
  return sources;
}

export function generateInsights(
  tree: TreeNode,
  entities: Entity[],
  quotes: Quote[],
): string[] {
  const insights: string[] = [];

  if (tree.summary) insights.push(tree.summary);

  const keyQuotes = quotes.filter((q) => q.significance === "key").slice(0, 2);
  for (const q of keyQuotes) insights.push(`"${q.text}"`);

  const concepts = entities.filter((e) => e.type === "concept").slice(0, 3);
  for (const c of concepts) {
    insights.push(`Key concept: ${c.value}${c.description ? ` - ${c.description}` : ""}`);
  }

  return insights.slice(0, 7);
}

export async function generateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
