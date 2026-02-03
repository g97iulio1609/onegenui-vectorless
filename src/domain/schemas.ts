import { z } from "zod";

// TreeNode schema for document structure
export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    id: z.string().optional().describe("Unique identifier for this node"),
    title: z.string().describe("Title or heading of this section"),
    level: z
      .number()
      .int()
      .min(0)
      .max(10)
      .describe("Depth level in the tree (0 = root)"),
    pageStart: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Starting page number"),
    pageEnd: z.number().int().min(1).optional().describe("Ending page number"),
    summary: z
      .string()
      .optional()
      .describe("AI-generated summary of this section"),
    content: z.string().optional().describe("Raw text content of this section"),
    text: z
      .string()
      .optional()
      .describe("Full text extracted from pages (from original PageIndex)"),
    children: z
      .array(TreeNodeSchema)
      .optional()
      .describe("Child nodes in the tree"),
  }),
);

export type TreeNode = {
  id?: string;
  title: string;
  level: number;
  pageStart?: number;
  pageEnd?: number;
  summary?: string;
  content?: string;
  text?: string;
  children?: TreeNode[];
};

// Entity reference schema (inline to avoid circular deps)
const EntityRefSchema = z.object({
  entityId: z.string().describe("Reference to entity ID"),
  relevance: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Relevance to context"),
});

// Quote reference schema (inline)
const QuoteRefSchema = z.object({
  quoteId: z.string().describe("Reference to quote ID"),
});

// Citation schema (inline for KnowledgeNode)
const CitationRefSchema = z.object({
  id: z.string().describe("Unique citation identifier"),
  text: z.string().describe("Full citation text"),
  type: z
    .enum(["book", "article", "web", "report", "thesis", "other"])
    .describe("Citation type"),
  authors: z.array(z.string()).optional().describe("List of authors"),
  title: z.string().optional().describe("Title of cited work"),
  year: z.number().int().optional().describe("Publication year"),
  source: z.string().optional().describe("Journal, publisher, or URL"),
  pageNumber: z.number().int().min(1).describe("Page where citation appears"),
  nodeId: z.string().describe("Node containing this citation"),
});

// Node metrics schema (inline)
const NodeMetricsRefSchema = z.object({
  wordCount: z.number().int().min(0).describe("Word count for this node"),
  complexity: z.enum(["low", "medium", "high"]).describe("Complexity level"),
  importance: z.number().min(0).max(100).describe("Importance score 0-100"),
  readingTimeMinutes: z.number().min(0).describe("Reading time in minutes"),
  depth: z.number().int().min(0).describe("Depth in tree structure"),
});

// Enhanced KnowledgeNode for v2.0
export const KnowledgeNodeSchema: z.ZodType<KnowledgeNode> = z.lazy(() =>
  z.object({
    id: z.string().describe("Unique identifier for this node"),
    title: z.string().describe("Title or heading of this section"),
    level: z.number().int().min(0).max(10).describe("Depth level in tree"),
    pageStart: z.number().int().min(1).describe("Starting page number"),
    pageEnd: z.number().int().min(1).describe("Ending page number"),
    summary: z.string().describe("Brief AI-generated summary"),
    detailedSummary: z.string().optional().describe("Detailed summary"),
    keyPoints: z.array(z.string()).describe("Key takeaways from this section"),
    entities: z.array(EntityRefSchema).describe("Entities in this section"),
    keywords: z.array(z.string()).describe("Keywords for this section"),
    quotes: z.array(QuoteRefSchema).describe("Notable quotes"),
    internalRefs: z.array(z.string()).describe("Related section IDs"),
    externalRefs: z.array(CitationRefSchema).describe("External citations"),
    metrics: NodeMetricsRefSchema.optional().describe("Section metrics"),
    rawText: z.string().optional().describe("Raw extracted text"),
    children: z.array(KnowledgeNodeSchema).describe("Child nodes"),
  }),
);

export type KnowledgeNode = {
  id: string;
  title: string;
  level: number;
  pageStart: number;
  pageEnd: number;
  summary: string;
  detailedSummary?: string;
  keyPoints: string[];
  entities: { entityId: string; relevance?: number }[];
  keywords: string[];
  quotes: { quoteId: string }[];
  internalRefs: string[];
  externalRefs: z.infer<typeof CitationRefSchema>[];
  metrics?: z.infer<typeof NodeMetricsRefSchema>;
  rawText?: string;
  children: KnowledgeNode[];
};

export const TocEntrySchema = z.object({
  title: z.string().describe("Section title as it appears in TOC"),
  pageNumber: z.number().int().min(1).describe("Page number for this entry"),
  level: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Indentation level (0 = top level)"),
});

export type TocEntry = z.infer<typeof TocEntrySchema>;

export const DocumentIndexSchema = z.object({
  documentId: z.string().describe("Unique identifier for this document"),
  title: z.string().describe("Document title"),
  description: z
    .string()
    .optional()
    .describe("AI-generated document description"),
  totalPages: z.number().int().min(1).describe("Total number of pages"),
  hasToc: z.boolean().describe("Whether a table of contents was detected"),
  tocEndPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Page where TOC ends (if present)"),
  tree: TreeNodeSchema.describe("Root node of the document structure tree"),
  metadata: z
    .object({
      processedAt: z.string().datetime().optional(),
      modelUsed: z.string().optional(),
      processingTimeMs: z.number().int().optional(),
    })
    .passthrough()
    .optional(),
});

export type DocumentIndex = z.infer<typeof DocumentIndexSchema>;

export const SSEEventTypeSchema = z.enum([
  "started",
  "progress",
  "toc_detected",
  "node_created",
  "summary_generated",
  "entity_extracted",
  "relation_found",
  "quote_extracted",
  "keyword_extracted",
  "citation_resolved",
  "knowledge_base_ready",
  "completed",
  "error",
]);

export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;

export const SSEEventSchema = z.object({
  type: SSEEventTypeSchema.describe("Event type"),
  timestamp: z.string().datetime().describe("When this event occurred"),
  data: z.record(z.string(), z.unknown()).optional().describe("Event-specific payload"),
});

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// ============== EXPORTED TYPES FOR PORTS ==============

// Entity type enum
export const EntityTypeSchema = z.enum([
  "person",
  "date",
  "place",
  "concept",
  "organization",
  "event",
  "number",
  "term",
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

// Occurrence schema
export const OccurrenceSchema = z.object({
  nodeId: z.string().describe("ID of the node containing this occurrence"),
  pageNumber: z.number().int().min(1).describe("Page number"),
  position: z.number().int().min(0).optional().describe("Character position"),
  context: z.string().optional().describe("Surrounding text context"),
});

export type Occurrence = z.infer<typeof OccurrenceSchema>;

// Entity schema (exported)
export const EntitySchema = z.object({
  id: z.string().describe("Unique entity identifier"),
  type: EntityTypeSchema.describe("Entity type"),
  value: z.string().describe("Raw extracted value"),
  normalized: z.string().optional().describe("Normalized/canonical form"),
  description: z.string().optional().describe("Brief description"),
  occurrences: z.array(OccurrenceSchema).describe("Where entity appears"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence"),
});

export type Entity = z.infer<typeof EntitySchema>;

// Relation type enum
export const RelationTypeSchema = z.enum([
  "references",
  "contradicts",
  "supports",
  "elaborates",
  "precedes",
  "follows",
  "summarizes",
  "defines",
  "examples",
]);

export type RelationType = z.infer<typeof RelationTypeSchema>;

// Relation schema (exported)
export const RelationSchema = z.object({
  id: z.string().describe("Unique relation identifier"),
  sourceNodeId: z.string().describe("Source node ID"),
  targetNodeId: z.string().describe("Target node ID"),
  type: RelationTypeSchema.describe("Relation type"),
  confidence: z.number().min(0).max(1).describe("Confidence score"),
  evidence: z.string().optional().describe("Text supporting this relation"),
});

export type Relation = z.infer<typeof RelationSchema>;

// Quote significance enum
export const QuoteSignificanceSchema = z.enum(["key", "supporting", "notable"]);

export type QuoteSignificance = z.infer<typeof QuoteSignificanceSchema>;

// Quote schema (exported)
export const QuoteSchema = z.object({
  id: z.string().describe("Unique quote identifier"),
  text: z.string().describe("Quote text"),
  pageNumber: z.number().int().min(1).describe("Page number"),
  nodeId: z.string().describe("Node containing this quote"),
  significance: QuoteSignificanceSchema.describe("Quote importance"),
  speaker: z.string().optional().describe("Who said this"),
  context: z.string().optional().describe("Surrounding context"),
});

export type Quote = z.infer<typeof QuoteSchema>;

// Keyword schema (exported)
export const KeywordSchema = z.object({
  id: z.string().describe("Unique keyword identifier"),
  term: z.string().describe("Keyword term"),
  frequency: z.number().int().min(1).describe("Total occurrences"),
  nodeIds: z.array(z.string()).describe("Nodes containing this keyword"),
  idf: z.number().optional().describe("IDF score"),
  tfidf: z.number().optional().describe("TF-IDF score"),
  isGlobal: z.boolean().default(false).describe("Is document-level keyword"),
});

export type Keyword = z.infer<typeof KeywordSchema>;

// Document metrics schema (exported)
export const DocumentMetricsSchema = z.object({
  totalWords: z.number().int().min(0).describe("Total word count"),
  totalCharacters: z.number().int().min(0).describe("Total character count"),
  averageWordsPerPage: z.number().min(0).describe("Average words per page"),
  readingTimeMinutes: z.number().min(0).describe("Estimated reading time"),
  complexityScore: z.number().min(0).max(100).describe("Complexity score"),
  vocabularyRichness: z.number().min(0).max(1).describe("Vocabulary diversity"),
  sentenceCount: z.number().int().min(0).describe("Total sentences"),
  averageSentenceLength: z.number().min(0).describe("Avg words per sentence"),
  paragraphCount: z.number().int().min(0).describe("Total paragraphs"),
});

export type DocumentMetrics = z.infer<typeof DocumentMetricsSchema>;

// Citation schema (exported)
export const CitationSchema = z.object({
  id: z.string().describe("Unique citation identifier"),
  text: z.string().describe("Full citation text"),
  type: z
    .enum(["book", "article", "web", "report", "thesis", "other"])
    .describe("Citation type"),
  authors: z.array(z.string()).optional().describe("List of authors"),
  title: z.string().optional().describe("Title of cited work"),
  year: z.number().int().optional().describe("Publication year"),
  source: z.string().optional().describe("Journal, publisher, or URL"),
  pageNumber: z.number().int().min(1).describe("Page where citation appears"),
  nodeId: z.string().describe("Node containing this citation"),
});

export type Citation = z.infer<typeof CitationSchema>;

// ============== KNOWLEDGE BASE SCHEMAS ==============

export const DocumentKnowledgeBaseSchema = z.object({
  id: z.string().describe("Unique knowledge base identifier"),
  filename: z.string().describe("Original filename"),
  mimeType: z.string().describe("Document MIME type"),
  hash: z.string().describe("Content hash for caching"),
  processedAt: z.string().datetime().describe("Processing timestamp"),
  totalPages: z.number().int().min(1).describe("Total pages"),
  totalTokens: z.number().int().min(0).describe("Estimated token count"),
  tree: KnowledgeNodeSchema.describe("Root of knowledge tree"),
  entities: z.array(EntitySchema).describe("All extracted entities"),
  relations: z.array(RelationSchema).describe("Relations between nodes"),
  keywords: z.array(KeywordSchema).describe("Global keywords"),
  quotes: z.array(QuoteSchema).describe("Significant quotes"),
  citations: z.array(CitationSchema).describe("Bibliographic citations"),
  metrics: DocumentMetricsSchema.describe("Document-level metrics"),
  description: z.string().describe("AI-generated document description"),
  keyInsights: z.array(z.string()).describe("Top insights from document"),
  processingMetadata: z
    .object({
      modelUsed: z.string().optional(),
      processingTimeMs: z.number().int().optional(),
      version: z.string().default("2.0.0"),
    })
    .optional(),
});

export type DocumentKnowledgeBase = z.infer<typeof DocumentKnowledgeBaseSchema>;

// Answer types for Q&A system
export const AnswerSourceSchema = z.object({
  nodeId: z.string().describe("Source node ID"),
  pageNumber: z.number().int().min(1).describe("Page number"),
  excerpt: z.string().describe("Relevant excerpt"),
  confidence: z.number().min(0).max(1).describe("Confidence score"),
});

export type AnswerSource = z.infer<typeof AnswerSourceSchema>;

export const AnswerSchema = z.object({
  id: z.string().describe("Answer identifier"),
  question: z.string().describe("Original question"),
  answer: z.string().describe("Generated answer"),
  sources: z.array(AnswerSourceSchema).describe("Supporting sources"),
  confidence: z.number().min(0).max(1).describe("Overall confidence"),
  generatedAt: z.string().datetime().describe("Generation timestamp"),
});

export type Answer = z.infer<typeof AnswerSchema>;
