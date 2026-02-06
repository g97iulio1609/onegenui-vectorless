/**
 * GenerateDocumentReportUseCase - Streaming document analysis report
 * Produces DocumentReport with JSON Patches for frontend streaming
 */
import type { LanguageModel } from "ai";
import type { DocumentParserPort, CachePort, Page } from "../ports/index.js";
import type {
  DocumentReport,
  ReportSection,
  SemanticOverlay,
  SectionQuote,
  DocumentReportEvent,
} from "../domain/document-report.schema.js";
import type { TreeNode, Entity, Quote, Relation } from "../domain/schemas.js";
import { createExtendedAgents } from "../agents/index.js";
import {
  flattenTree,
  countSections,
  createSimpleTree,
  convertToReportSections,
  aggregateEntities,
  convertRelations,
  buildSources,
  generateInsights,
  generateHash,
} from "./document-report-helpers.js";
import { getGlobalLogger } from "../infrastructure/logger.js";

export interface GenerateDocumentReportRequest {
  buffer: ArrayBuffer;
  filename?: string;
  mimeType: string;
  options?: {
    includeSemanticOverlay?: boolean;
    generateTimeline?: boolean;
    generateConceptMap?: boolean;
  };
}

export interface GenerateDocumentReportResult {
  report: DocumentReport;
  cached: boolean;
}

export interface GenerateDocumentReportUseCaseDeps {
  parser: DocumentParserPort;
  cache: CachePort;
  model: LanguageModel;
  onEvent?: (event: DocumentReportEvent) => void;
  onPatch?: (patch: string) => void;
}

export class GenerateDocumentReportUseCase {
  constructor(private deps: GenerateDocumentReportUseCaseDeps) {}

  async execute(request: GenerateDocumentReportRequest): Promise<GenerateDocumentReportResult> {
    const { buffer, filename, mimeType, options = {} } = request;
    const { includeSemanticOverlay = true, generateTimeline = true, generateConceptMap = false } = options;
    const startTime = Date.now();
    const hash = await generateHash(buffer);
    const logger = getGlobalLogger();

    logger.info("REPORT_UC", "execute() START", { filename, mimeType, bufferSize: buffer.byteLength });

    // Check cache
    const cached = await this.deps.cache.get<DocumentReport>(`report:${hash}`);
    if (cached) {
      logger.info("REPORT_UC", "Cache HIT - returning cached report", { sectionsCount: cached.sections.length });
      this.streamFinalPatch(cached);
      return { report: cached, cached: true };
    }

    this.emit("started", { filename, mimeType });

    // Parse and detect structure
    const pages = await this.deps.parser.parse(buffer, mimeType);
    logger.info("REPORT_UC", "Pages parsed", { pageCount: pages.length });

    const agents = createExtendedAgents(this.deps.model);
    this.emit("structure-detected", { totalPages: pages.length });
    const tree = await this.detectStructure(agents, pages);
    logger.info("REPORT_UC", "Tree detected", {
      title: tree.title,
      level: tree.level,
      childrenCount: tree.children?.length ?? 0,
      hasId: !!tree.id,
      pageStart: tree.pageStart,
      pageEnd: tree.pageEnd,
    });

    // Log tree node IDs for debugging
    const flatNodes = flattenTree(tree);
    logger.info("REPORT_UC", "Flat tree nodes", {
      totalNodes: flatNodes.length,
      nodeIds: flatNodes.map(n => n.id || "NO_ID"),
      nodeTitles: flatNodes.map(n => n.title),
      nodeLevels: flatNodes.map(n => n.level),
    });

    // Process sections and extract data
    const { sections, allEntities, allQuotes, allRelations } = await this.processSections(agents, tree, pages);

    logger.info("REPORT_UC", "Sections processed", {
      sectionsCount: sections.length,
      entitiesCount: allEntities.length,
      quotesCount: allQuotes.length,
      relationsCount: allRelations.length,
    });

    // Log entity nodeIds for debugging matching
    if (allEntities.length > 0) {
      const entityNodeIds = new Set(allEntities.flatMap(e => e.occurrences.map(o => o.nodeId)));
      logger.info("REPORT_UC", "Entity nodeIds (for matching)", {
        uniqueNodeIds: [...entityNodeIds],
        treeNodeIds: flatNodes.map(n => n.id || "NO_ID"),
      });
    }

    // Build semantic overlay
    let semanticOverlay: SemanticOverlay = { topEntities: [], relations: [], keyInsights: [], globalQuotes: [] };
    if (includeSemanticOverlay) {
      semanticOverlay = this.buildSemanticOverlay(allEntities, allQuotes, allRelations, tree, generateTimeline, generateConceptMap);
      this.emit("overlay-complete", { entitiesCount: semanticOverlay.topEntities.length });
    }

    // Generate description and build final report
    const description = await agents.summarizer.generateDocumentDescription(tree);
    const report: DocumentReport = {
      title: tree.title,
      description,
      totalPages: pages.length,
      filename,
      sections,
      semanticOverlay,
      sources: buildSources(sections),
      processingStats: {
        sectionsAnalyzed: countSections(sections),
        entitiesExtracted: allEntities.length,
        relationsFound: allRelations.length,
        processingTimeMs: Date.now() - startTime,
      },
    };

    await this.deps.cache.set(`report:${hash}`, report);
    this.streamFinalPatch(report);
    this.emit("completed", { processingTimeMs: Date.now() - startTime });
    return { report, cached: false };
  }

  private async detectStructure(agents: ReturnType<typeof createExtendedAgents>, pages: Page[]): Promise<TreeNode> {
    let tree: TreeNode | null = null;
    for await (const { entries, tocEndPage } of agents.tocDetector.detectToc(pages)) {
      if (entries) {
        for await (const { node } of agents.structureExtractor.extractStructure(pages, entries, tocEndPage || null)) {
          if (node) tree = node;
        }
      }
    }
    return tree || createSimpleTree(pages);
  }

  private async processSections(
    agents: ReturnType<typeof createExtendedAgents>,
    tree: TreeNode,
    pages: Page[],
  ): Promise<{ sections: ReportSection[]; allEntities: Entity[]; allQuotes: Quote[]; allRelations: Relation[] }> {
    const allEntities: Entity[] = [];
    const allQuotes: Quote[] = [];
    const allRelations: Relation[] = [];
    const flatNodes = flattenTree(tree);
    const logger = getGlobalLogger();

    logger.info("REPORT_UC", "processSections START", {
      flatNodeCount: flatNodes.length,
      nodeIds: flatNodes.map(n => n.id),
    });

    // Generate summaries
    let summaryCount = 0;
    for await (const { nodeId, summary } of agents.summarizer.generateSummaries(tree, pages)) {
      const node = flatNodes.find((n) => n.id === nodeId);
      if (node && summary) {
        node.summary = summary;
        summaryCount++;
      }
    }
    logger.info("REPORT_UC", "Summaries generated", { summaryCount, totalNodes: flatNodes.length });

    // Extract entities, quotes, relations
    for await (const { entity } of agents.entityExtractor.extractEntities(pages, tree)) {
      if (entity) allEntities.push(entity);
    }
    this.emit("entity-aggregated", { count: allEntities.length });
    logger.info("REPORT_UC", "Entities extracted", {
      count: allEntities.length,
      sampleOccurrenceNodeIds: allEntities.slice(0, 3).map(e => e.occurrences.map(o => o.nodeId)),
    });

    for await (const { quote } of agents.quoteExtractor.extractQuotes(pages, tree)) {
      if (quote) allQuotes.push(quote);
    }
    logger.info("REPORT_UC", "Quotes extracted", {
      count: allQuotes.length,
      sampleNodeIds: allQuotes.slice(0, 3).map(q => q.nodeId),
    });

    for await (const { relation } of agents.relationExtractor.extractRelations(tree, allEntities)) {
      if (relation) allRelations.push(relation);
    }
    this.emit("relation-discovered", { count: allRelations.length });

    // Convert to sections and stream
    logger.info("REPORT_UC", "convertToReportSections input", {
      treeId: tree.id,
      treeLevel: tree.level,
      treeChildrenCount: tree.children?.length ?? 0,
      entitiesCount: allEntities.length,
      quotesCount: allQuotes.length,
    });
    const sections = convertToReportSections(tree, allEntities, allQuotes);
    logger.info("REPORT_UC", "convertToReportSections output", {
      sectionsCount: sections.length,
      sectionTitles: sections.map(s => s.title),
    });

    for (const section of sections) {
      this.emit("section-analyzed", { sectionId: section.id, title: section.title });
      this.streamSectionPatch(section);
    }

    return { sections, allEntities, allQuotes, allRelations };
  }

  private buildSemanticOverlay(
    entities: Entity[],
    quotes: Quote[],
    relations: Relation[],
    tree: TreeNode,
    genTimeline: boolean,
    genConceptMap: boolean,
  ): SemanticOverlay {
    const globalQuotes: SectionQuote[] = quotes
      .filter((q) => q.significance === "key")
      .slice(0, 10)
      .map((q) => ({ text: q.text, significance: q.significance, speaker: q.speaker }));

    const overlay: SemanticOverlay = {
      topEntities: aggregateEntities(entities),
      relations: convertRelations(relations, tree),
      keyInsights: generateInsights(tree, entities, quotes),
      globalQuotes,
    };
    this.emit("insight-generated", { count: overlay.keyInsights.length });

    if (genTimeline) {
      overlay.timeline = entities
        .filter((e) => e.type === "date" || e.type === "event")
        .slice(0, 20)
        .map((e) => ({ date: e.value, event: e.description || e.value, pageRef: e.occurrences[0]?.pageNumber || 1, sectionId: e.occurrences[0]?.nodeId }));
    }

    if (genConceptMap) {
      const concepts = entities.filter((e) => e.type === "concept");
      overlay.conceptMap = concepts.slice(0, 15).map((c) => ({
        concept: c.value,
        relatedConcepts: concepts.filter((o) => o.id !== c.id).slice(0, 3).map((o) => o.value),
        weight: c.confidence || 0.5,
      }));
    }

    return overlay;
  }

  private emit(type: string, data: Record<string, unknown>) {
    this.deps.onEvent?.({ type: type as DocumentReportEvent["type"], timestamp: new Date().toISOString(), data });
  }

  private streamSectionPatch(section: ReportSection) {
    if (!this.deps.onPatch) return;
    this.deps.onPatch(JSON.stringify({ op: "add", path: `/elements/document_report/props/sections/-`, value: section }));
  }

  private streamFinalPatch(report: DocumentReport) {
    if (!this.deps.onPatch) return;
    this.deps.onPatch(JSON.stringify({ op: "add", path: "/elements/document_report", value: { key: "document_report", type: "DocumentReport", props: report } }));
    this.deps.onPatch(JSON.stringify({ op: "set", path: "/root", value: "document_report" }));
  }
}
