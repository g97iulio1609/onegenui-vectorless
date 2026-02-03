import { z } from "zod";
export declare const TreeNodeSchema: z.ZodType<TreeNode>;
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
declare const CitationRefSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    type: z.ZodEnum<{
        book: "book";
        article: "article";
        web: "web";
        report: "report";
        thesis: "thesis";
        other: "other";
    }>;
    authors: z.ZodOptional<z.ZodArray<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
}, z.core.$strip>;
declare const NodeMetricsRefSchema: z.ZodObject<{
    wordCount: z.ZodNumber;
    complexity: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    importance: z.ZodNumber;
    readingTimeMinutes: z.ZodNumber;
    depth: z.ZodNumber;
}, z.core.$strip>;
export declare const KnowledgeNodeSchema: z.ZodType<KnowledgeNode>;
export type KnowledgeNode = {
    id: string;
    title: string;
    level: number;
    pageStart: number;
    pageEnd: number;
    summary: string;
    detailedSummary?: string;
    keyPoints: string[];
    entities: {
        entityId: string;
        relevance?: number;
    }[];
    keywords: string[];
    quotes: {
        quoteId: string;
    }[];
    internalRefs: string[];
    externalRefs: z.infer<typeof CitationRefSchema>[];
    metrics?: z.infer<typeof NodeMetricsRefSchema>;
    rawText?: string;
    children: KnowledgeNode[];
};
export declare const TocEntrySchema: z.ZodObject<{
    title: z.ZodString;
    pageNumber: z.ZodNumber;
    level: z.ZodNumber;
}, z.core.$strip>;
export type TocEntry = z.infer<typeof TocEntrySchema>;
export declare const DocumentIndexSchema: z.ZodObject<{
    documentId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    totalPages: z.ZodNumber;
    hasToc: z.ZodBoolean;
    tocEndPage: z.ZodOptional<z.ZodNumber>;
    tree: z.ZodType<TreeNode, unknown, z.core.$ZodTypeInternals<TreeNode, unknown>>;
    metadata: z.ZodOptional<z.ZodObject<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
}, z.core.$strip>;
export type DocumentIndex = z.infer<typeof DocumentIndexSchema>;
export declare const SSEEventTypeSchema: z.ZodEnum<{
    error: "error";
    started: "started";
    progress: "progress";
    toc_detected: "toc_detected";
    node_created: "node_created";
    summary_generated: "summary_generated";
    entity_extracted: "entity_extracted";
    relation_found: "relation_found";
    quote_extracted: "quote_extracted";
    keyword_extracted: "keyword_extracted";
    citation_resolved: "citation_resolved";
    knowledge_base_ready: "knowledge_base_ready";
    completed: "completed";
}>;
export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;
export declare const SSEEventSchema: z.ZodObject<{
    type: z.ZodEnum<{
        error: "error";
        started: "started";
        progress: "progress";
        toc_detected: "toc_detected";
        node_created: "node_created";
        summary_generated: "summary_generated";
        entity_extracted: "entity_extracted";
        relation_found: "relation_found";
        quote_extracted: "quote_extracted";
        keyword_extracted: "keyword_extracted";
        citation_resolved: "citation_resolved";
        knowledge_base_ready: "knowledge_base_ready";
        completed: "completed";
    }>;
    timestamp: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type SSEEvent = z.infer<typeof SSEEventSchema>;
export declare const EntityTypeSchema: z.ZodEnum<{
    number: "number";
    date: "date";
    person: "person";
    place: "place";
    concept: "concept";
    organization: "organization";
    event: "event";
    term: "term";
}>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export declare const OccurrenceSchema: z.ZodObject<{
    nodeId: z.ZodString;
    pageNumber: z.ZodNumber;
    position: z.ZodOptional<z.ZodNumber>;
    context: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Occurrence = z.infer<typeof OccurrenceSchema>;
export declare const EntitySchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        number: "number";
        date: "date";
        person: "person";
        place: "place";
        concept: "concept";
        organization: "organization";
        event: "event";
        term: "term";
    }>;
    value: z.ZodString;
    normalized: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    occurrences: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        pageNumber: z.ZodNumber;
        position: z.ZodOptional<z.ZodNumber>;
        context: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type Entity = z.infer<typeof EntitySchema>;
export declare const RelationTypeSchema: z.ZodEnum<{
    references: "references";
    contradicts: "contradicts";
    supports: "supports";
    elaborates: "elaborates";
    precedes: "precedes";
    follows: "follows";
    summarizes: "summarizes";
    defines: "defines";
    examples: "examples";
}>;
export type RelationType = z.infer<typeof RelationTypeSchema>;
export declare const RelationSchema: z.ZodObject<{
    id: z.ZodString;
    sourceNodeId: z.ZodString;
    targetNodeId: z.ZodString;
    type: z.ZodEnum<{
        references: "references";
        contradicts: "contradicts";
        supports: "supports";
        elaborates: "elaborates";
        precedes: "precedes";
        follows: "follows";
        summarizes: "summarizes";
        defines: "defines";
        examples: "examples";
    }>;
    confidence: z.ZodNumber;
    evidence: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Relation = z.infer<typeof RelationSchema>;
export declare const QuoteSignificanceSchema: z.ZodEnum<{
    key: "key";
    supporting: "supporting";
    notable: "notable";
}>;
export type QuoteSignificance = z.infer<typeof QuoteSignificanceSchema>;
export declare const QuoteSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
    significance: z.ZodEnum<{
        key: "key";
        supporting: "supporting";
        notable: "notable";
    }>;
    speaker: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Quote = z.infer<typeof QuoteSchema>;
export declare const KeywordSchema: z.ZodObject<{
    id: z.ZodString;
    term: z.ZodString;
    frequency: z.ZodNumber;
    nodeIds: z.ZodArray<z.ZodString>;
    idf: z.ZodOptional<z.ZodNumber>;
    tfidf: z.ZodOptional<z.ZodNumber>;
    isGlobal: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type Keyword = z.infer<typeof KeywordSchema>;
export declare const DocumentMetricsSchema: z.ZodObject<{
    totalWords: z.ZodNumber;
    totalCharacters: z.ZodNumber;
    averageWordsPerPage: z.ZodNumber;
    readingTimeMinutes: z.ZodNumber;
    complexityScore: z.ZodNumber;
    vocabularyRichness: z.ZodNumber;
    sentenceCount: z.ZodNumber;
    averageSentenceLength: z.ZodNumber;
    paragraphCount: z.ZodNumber;
}, z.core.$strip>;
export type DocumentMetrics = z.infer<typeof DocumentMetricsSchema>;
export declare const CitationSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    type: z.ZodEnum<{
        book: "book";
        article: "article";
        web: "web";
        report: "report";
        thesis: "thesis";
        other: "other";
    }>;
    authors: z.ZodOptional<z.ZodArray<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
}, z.core.$strip>;
export type Citation = z.infer<typeof CitationSchema>;
export declare const DocumentKnowledgeBaseSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    mimeType: z.ZodString;
    hash: z.ZodString;
    processedAt: z.ZodString;
    totalPages: z.ZodNumber;
    totalTokens: z.ZodNumber;
    tree: z.ZodType<KnowledgeNode, unknown, z.core.$ZodTypeInternals<KnowledgeNode, unknown>>;
    entities: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            number: "number";
            date: "date";
            person: "person";
            place: "place";
            concept: "concept";
            organization: "organization";
            event: "event";
            term: "term";
        }>;
        value: z.ZodString;
        normalized: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        occurrences: z.ZodArray<z.ZodObject<{
            nodeId: z.ZodString;
            pageNumber: z.ZodNumber;
            position: z.ZodOptional<z.ZodNumber>;
            context: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    relations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceNodeId: z.ZodString;
        targetNodeId: z.ZodString;
        type: z.ZodEnum<{
            references: "references";
            contradicts: "contradicts";
            supports: "supports";
            elaborates: "elaborates";
            precedes: "precedes";
            follows: "follows";
            summarizes: "summarizes";
            defines: "defines";
            examples: "examples";
        }>;
        confidence: z.ZodNumber;
        evidence: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    keywords: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        term: z.ZodString;
        frequency: z.ZodNumber;
        nodeIds: z.ZodArray<z.ZodString>;
        idf: z.ZodOptional<z.ZodNumber>;
        tfidf: z.ZodOptional<z.ZodNumber>;
        isGlobal: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    quotes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        pageNumber: z.ZodNumber;
        nodeId: z.ZodString;
        significance: z.ZodEnum<{
            key: "key";
            supporting: "supporting";
            notable: "notable";
        }>;
        speaker: z.ZodOptional<z.ZodString>;
        context: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    citations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        type: z.ZodEnum<{
            book: "book";
            article: "article";
            web: "web";
            report: "report";
            thesis: "thesis";
            other: "other";
        }>;
        authors: z.ZodOptional<z.ZodArray<z.ZodString>>;
        title: z.ZodOptional<z.ZodString>;
        year: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
        pageNumber: z.ZodNumber;
        nodeId: z.ZodString;
    }, z.core.$strip>>;
    metrics: z.ZodObject<{
        totalWords: z.ZodNumber;
        totalCharacters: z.ZodNumber;
        averageWordsPerPage: z.ZodNumber;
        readingTimeMinutes: z.ZodNumber;
        complexityScore: z.ZodNumber;
        vocabularyRichness: z.ZodNumber;
        sentenceCount: z.ZodNumber;
        averageSentenceLength: z.ZodNumber;
        paragraphCount: z.ZodNumber;
    }, z.core.$strip>;
    description: z.ZodString;
    keyInsights: z.ZodArray<z.ZodString>;
    processingMetadata: z.ZodOptional<z.ZodObject<{
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
        version: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DocumentKnowledgeBase = z.infer<typeof DocumentKnowledgeBaseSchema>;
export declare const AnswerSourceSchema: z.ZodObject<{
    nodeId: z.ZodString;
    pageNumber: z.ZodNumber;
    excerpt: z.ZodString;
    confidence: z.ZodNumber;
}, z.core.$strip>;
export type AnswerSource = z.infer<typeof AnswerSourceSchema>;
export declare const AnswerSchema: z.ZodObject<{
    id: z.ZodString;
    question: z.ZodString;
    answer: z.ZodString;
    sources: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        pageNumber: z.ZodNumber;
        excerpt: z.ZodString;
        confidence: z.ZodNumber;
    }, z.core.$strip>>;
    confidence: z.ZodNumber;
    generatedAt: z.ZodString;
}, z.core.$strip>;
export type Answer = z.infer<typeof AnswerSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map