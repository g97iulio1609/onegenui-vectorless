/**
 * DocumentReport Schema - Streaming document analysis report
 * Similar to ResearchReport but for single document deep analysis
 */
import { z } from "zod";
import { EntityTypeSchema, QuoteSignificanceSchema, RelationTypeSchema } from "./schemas.js";

// Section entity (lightweight reference)
export const SectionEntitySchema = z.object({
  type: EntityTypeSchema.describe("Entity type"),
  value: z.string().describe("Entity value"),
  relevance: z.number().min(0).max(1).describe("Relevance to section"),
});

export type SectionEntity = z.infer<typeof SectionEntitySchema>;

// Section quote (lightweight)
export const SectionQuoteSchema = z.object({
  text: z.string().describe("Quote text"),
  significance: QuoteSignificanceSchema.describe("Quote importance"),
  speaker: z.string().optional().describe("Speaker if applicable"),
});

export type SectionQuote = z.infer<typeof SectionQuoteSchema>;

// Report section (mirrors document structure)
export const ReportSectionSchema: z.ZodType<ReportSection> = z.lazy(() =>
  z.object({
    id: z.string().describe("Section identifier"),
    title: z.string().describe("Section title"),
    level: z.number().int().min(0).max(10).describe("Depth in hierarchy"),
    pageStart: z.number().int().min(1).describe("Starting page"),
    pageEnd: z.number().int().min(1).describe("Ending page"),
    summary: z.string().describe("Detailed section summary"),
    keyPoints: z.array(z.string()).describe("Key takeaways from section"),
    entities: z.array(SectionEntitySchema).describe("Entities in section"),
    quotes: z.array(SectionQuoteSchema).describe("Notable quotes"),
    children: z.array(ReportSectionSchema).optional().describe("Child sections"),
  }),
);

export type ReportSection = {
  id: string;
  title: string;
  level: number;
  pageStart: number;
  pageEnd: number;
  summary: string;
  keyPoints: string[];
  entities: SectionEntity[];
  quotes: SectionQuote[];
  children?: ReportSection[];
};

// Aggregated entity for semantic overlay
export const AggregatedEntitySchema = z.object({
  id: z.string().describe("Entity identifier"),
  type: EntityTypeSchema.describe("Entity type"),
  value: z.string().describe("Entity value"),
  description: z.string().optional().describe("Entity description"),
  occurrenceCount: z.number().int().min(1).describe("Total occurrences"),
  sectionIds: z.array(z.string()).describe("Sections containing entity"),
  importance: z.number().min(0).max(100).describe("Importance score"),
});

export type AggregatedEntity = z.infer<typeof AggregatedEntitySchema>;

// Relation for semantic overlay
export const ReportRelationSchema = z.object({
  id: z.string().describe("Relation identifier"),
  sourceTitle: z.string().describe("Source section title"),
  targetTitle: z.string().describe("Target section title"),
  type: RelationTypeSchema.describe("Relation type"),
  evidence: z.string().describe("Supporting evidence"),
});

export type ReportRelation = z.infer<typeof ReportRelationSchema>;

// Timeline event
export const TimelineEventSchema = z.object({
  date: z.string().describe("Date or time reference"),
  event: z.string().describe("Event description"),
  pageRef: z.number().int().min(1).describe("Page reference"),
  sectionId: z.string().optional().describe("Related section"),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// Concept link for concept map
export const ConceptLinkSchema = z.object({
  concept: z.string().describe("Main concept"),
  relatedConcepts: z.array(z.string()).describe("Related concepts"),
  weight: z.number().min(0).max(1).describe("Relationship strength"),
});

export type ConceptLink = z.infer<typeof ConceptLinkSchema>;

// Semantic overlay (aggregated analysis)
export const SemanticOverlaySchema = z.object({
  topEntities: z.array(AggregatedEntitySchema).describe("Top entities"),
  relations: z.array(ReportRelationSchema).describe("Section relations"),
  keyInsights: z.array(z.string()).describe("Global insights"),
  globalQuotes: z.array(SectionQuoteSchema).describe("Most important quotes"),
  timeline: z.array(TimelineEventSchema).optional().describe("Event timeline"),
  conceptMap: z.array(ConceptLinkSchema).optional().describe("Concept map"),
});

export type SemanticOverlay = z.infer<typeof SemanticOverlaySchema>;

// Page source reference
export const PageSourceSchema = z.object({
  id: z.string().describe("Source identifier"),
  title: z.string().describe("Section title"),
  pageNumber: z.number().int().min(1).describe("Page number"),
});

export type PageSource = z.infer<typeof PageSourceSchema>;

// Main DocumentReport schema
export const DocumentReportSchema = z.object({
  title: z.string().describe("Document title"),
  description: z.string().describe("Document description/summary"),
  totalPages: z.number().int().min(1).describe("Total pages"),
  filename: z.string().optional().describe("Original filename"),
  sections: z.array(ReportSectionSchema).describe("Document sections"),
  semanticOverlay: SemanticOverlaySchema.describe("Aggregated semantic analysis"),
  sources: z.array(PageSourceSchema).describe("Page references"),
  processingStats: z
    .object({
      sectionsAnalyzed: z.number().int().min(0),
      entitiesExtracted: z.number().int().min(0),
      relationsFound: z.number().int().min(0),
      processingTimeMs: z.number().int().min(0),
    })
    .optional()
    .describe("Processing statistics"),
});

export type DocumentReport = z.infer<typeof DocumentReportSchema>;

// SSE Event types specific to document report
export const DocumentReportEventTypeSchema = z.enum([
  "started",
  "structure-detected",
  "section-analyzing",
  "section-analyzed",
  "entity-aggregated",
  "relation-discovered",
  "insight-generated",
  "overlay-complete",
  "completed",
  "error",
]);

export type DocumentReportEventType = z.infer<typeof DocumentReportEventTypeSchema>;

export const DocumentReportEventSchema = z.object({
  type: DocumentReportEventTypeSchema.describe("Event type"),
  timestamp: z.string().datetime().describe("Event timestamp"),
  data: z.record(z.string(), z.unknown()).optional().describe("Event payload"),
});

export type DocumentReportEvent = z.infer<typeof DocumentReportEventSchema>;
