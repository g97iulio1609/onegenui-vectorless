import type { LanguageModel } from "ai";
import type {
  DocumentParserPort,
  CachePort,
  SSEEmitterPort,
  GenerateKnowledgeBaseRequest,
  GenerateKnowledgeBaseResult,
  Page,
} from "../ports/index.js";
import type {
  DocumentKnowledgeBase,
  KnowledgeNode,
  TreeNode,
  Entity,
  Relation,
  Quote,
  Keyword,
  Citation,
} from "../domain/schemas.js";
import { createExtendedAgents } from "../agents/index.js";

interface GenerateKnowledgeBaseUseCaseDeps {
  parser: DocumentParserPort;
  cache: CachePort;
  sseEmitter: SSEEmitterPort;
  model: LanguageModel;
}

export class GenerateKnowledgeBaseUseCase {
  constructor(private deps: GenerateKnowledgeBaseUseCaseDeps) {}

  async execute(
    request: GenerateKnowledgeBaseRequest,
  ): Promise<GenerateKnowledgeBaseResult> {
    const { buffer, filename, mimeType, options = {} } = request;
    const {
      extractEntities = true,
      extractRelations = true,
      extractQuotes = true,
      extractKeywords = true,
      extractCitations = true,
      generateSummaries = true,
      generateKeyInsights = true,
    } = options;

    const startTime = Date.now();

    // Generate hash for caching
    const hash = await this.generateHash(buffer);

    // Check cache
    const cached = await this.deps.cache.get<DocumentKnowledgeBase>(
      `kb:${hash}`,
    );
    if (cached) {
      return { knowledgeBase: cached, cached: true };
    }

    this.emit("started", { filename, mimeType });

    // Parse document
    const pages = await this.deps.parser.parse(buffer, mimeType);
    this.emit("progress", { phase: "parsing", totalPages: pages.length });

    // Create agents
    const agents = createExtendedAgents(this.deps.model);

    // Extract structure (using existing TOC detection)
    let tree: TreeNode | null = null;
    for await (const {
      event,
      entries,
      tocEndPage,
    } of agents.tocDetector.detectToc(pages)) {
      this.deps.sseEmitter.emit(event);
      if (entries) {
        for await (const {
          event: structEvent,
          node,
        } of agents.structureExtractor.extractStructure(
          pages,
          entries,
          tocEndPage || null,
        )) {
          this.deps.sseEmitter.emit(structEvent);
          if (node) tree = node;
        }
      }
    }

    if (!tree) {
      // No TOC found, create simple structure
      tree = this.createSimpleTree(pages);
    }

    // Generate summaries
    if (generateSummaries) {
      for await (const { event } of agents.summarizer.generateSummaries(
        tree,
        pages,
      )) {
        this.deps.sseEmitter.emit(event);
      }
    }

    // Extract entities
    const entities: Entity[] = [];
    if (extractEntities) {
      for await (const {
        event,
        entity,
      } of agents.entityExtractor.extractEntities(pages, tree)) {
        this.deps.sseEmitter.emit(event);
        if (entity) entities.push(entity);
      }
    }

    // Extract relations
    const relations: Relation[] = [];
    if (extractRelations) {
      for await (const {
        event,
        relation,
      } of agents.relationExtractor.extractRelations(tree, entities)) {
        this.deps.sseEmitter.emit(event);
        if (relation) relations.push(relation);
      }
    }

    // Extract quotes
    const quotes: Quote[] = [];
    if (extractQuotes) {
      for await (const { event, quote } of agents.quoteExtractor.extractQuotes(
        pages,
        tree,
      )) {
        this.deps.sseEmitter.emit(event);
        if (quote) quotes.push(quote);
      }
    }

    // Extract keywords
    const keywords: Keyword[] = [];
    if (extractKeywords) {
      for await (const {
        event,
        keyword,
      } of agents.keywordExtractor.extractKeywords(pages, tree)) {
        this.deps.sseEmitter.emit(event);
        if (keyword) keywords.push(keyword);
      }
    }

    // Extract citations
    const citations: Citation[] = [];
    if (extractCitations) {
      for await (const {
        event,
        citation,
      } of agents.citationResolver.resolveCitations(pages, tree)) {
        this.deps.sseEmitter.emit(event);
        if (citation) citations.push(citation);
      }
    }

    // Calculate metrics
    const metrics = await agents.metricsCalculator.calculateMetrics(
      pages,
      tree,
    );

    // Generate description
    const description =
      await agents.summarizer.generateDocumentDescription(tree);

    // Generate key insights
    const keyInsights = generateKeyInsights
      ? this.extractKeyInsights(tree, quotes, entities)
      : [];

    // Convert TreeNode to KnowledgeNode
    const knowledgeTree = this.convertToKnowledgeNode(
      tree,
      entities,
      quotes,
      citations,
    );

    // Build knowledge base
    const knowledgeBase: DocumentKnowledgeBase = {
      id: `kb-${Date.now()}`,
      filename,
      mimeType,
      hash,
      processedAt: new Date().toISOString(),
      totalPages: pages.length,
      totalTokens: metrics.totalWords * 1.3, // rough estimate
      tree: knowledgeTree,
      entities,
      relations,
      keywords,
      quotes,
      citations,
      metrics,
      description,
      keyInsights,
      processingMetadata: {
        processingTimeMs: Date.now() - startTime,
        version: "2.0.0",
      },
    };

    // Cache result
    await this.deps.cache.set(`kb:${hash}`, knowledgeBase);

    this.emit("knowledge_base_ready", { id: knowledgeBase.id });
    this.emit("completed", { processingTimeMs: Date.now() - startTime });

    return { knowledgeBase, cached: false };
  }

  private emit(type: string, data: Record<string, unknown>) {
    this.deps.sseEmitter.emit({
      type: type as never,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  private async generateHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private createSimpleTree(pages: Page[]): TreeNode {
    return {
      id: "root",
      title: "Document",
      level: 0,
      pageStart: 1,
      pageEnd: pages.length,
      children: [],
    };
  }

  private extractKeyInsights(
    tree: TreeNode,
    quotes: Quote[],
    entities: Entity[],
  ): string[] {
    const insights: string[] = [];

    // Add key quotes as insights
    const keyQuotes = quotes
      .filter((q) => q.significance === "key")
      .slice(0, 3)
      .map((q) => q.text);
    insights.push(...keyQuotes);

    // Add top concepts
    const concepts = entities
      .filter((e) => e.type === "concept")
      .slice(0, 3)
      .map((e) => `Key concept: ${e.value}`);
    insights.push(...concepts);

    // Add from tree summary
    if (tree.summary) {
      insights.unshift(tree.summary);
    }

    return insights.slice(0, 5);
  }

  private convertToKnowledgeNode(
    node: TreeNode,
    entities: Entity[],
    quotes: Quote[],
    citations: Citation[],
  ): KnowledgeNode {
    const nodeId = node.id || `node-${Math.random().toString(36).slice(2)}`;

    // Find entities for this node
    const nodeEntities = entities
      .filter((e) => e.occurrences.some((o) => o.nodeId === nodeId))
      .map((e) => ({ entityId: e.id }));

    // Find quotes for this node
    const nodeQuotes = quotes
      .filter((q) => q.nodeId === nodeId)
      .map((q) => ({ quoteId: q.id }));

    // Find citations for this node
    const nodeCitations = citations.filter((c) => c.nodeId === nodeId);

    return {
      id: nodeId,
      title: node.title,
      level: node.level,
      pageStart: node.pageStart || 1,
      pageEnd: node.pageEnd || node.pageStart || 1,
      summary: node.summary || "",
      keyPoints: [],
      entities: nodeEntities,
      keywords: [],
      quotes: nodeQuotes,
      internalRefs: [],
      externalRefs: nodeCitations,
      rawText: node.text,
      children: (node.children || []).map((child) =>
        this.convertToKnowledgeNode(child, entities, quotes, citations),
      ),
    };
  }
}
