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
    type: z.ZodEnum<["book", "article", "web", "report", "thesis", "other"]>;
    authors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    title: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "book" | "article" | "web" | "report" | "thesis" | "other";
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    title?: string | undefined;
    authors?: string[] | undefined;
    year?: number | undefined;
    source?: string | undefined;
}, {
    type: "book" | "article" | "web" | "report" | "thesis" | "other";
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    title?: string | undefined;
    authors?: string[] | undefined;
    year?: number | undefined;
    source?: string | undefined;
}>;
declare const NodeMetricsRefSchema: z.ZodObject<{
    wordCount: z.ZodNumber;
    complexity: z.ZodEnum<["low", "medium", "high"]>;
    importance: z.ZodNumber;
    readingTimeMinutes: z.ZodNumber;
    depth: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    wordCount: number;
    complexity: "low" | "medium" | "high";
    importance: number;
    readingTimeMinutes: number;
    depth: number;
}, {
    wordCount: number;
    complexity: "low" | "medium" | "high";
    importance: number;
    readingTimeMinutes: number;
    depth: number;
}>;
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
}, "strip", z.ZodTypeAny, {
    title: string;
    level: number;
    pageNumber: number;
}, {
    title: string;
    level: number;
    pageNumber: number;
}>;
export type TocEntry = z.infer<typeof TocEntrySchema>;
export declare const DocumentIndexSchema: z.ZodObject<{
    documentId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    totalPages: z.ZodNumber;
    hasToc: z.ZodBoolean;
    tocEndPage: z.ZodOptional<z.ZodNumber>;
    tree: z.ZodType<TreeNode, z.ZodTypeDef, TreeNode>;
    metadata: z.ZodOptional<z.ZodObject<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    documentId: string;
    totalPages: number;
    hasToc: boolean;
    tree: TreeNode;
    description?: string | undefined;
    tocEndPage?: number | undefined;
    metadata?: z.objectOutputType<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    title: string;
    documentId: string;
    totalPages: number;
    hasToc: boolean;
    tree: TreeNode;
    description?: string | undefined;
    tocEndPage?: number | undefined;
    metadata?: z.objectInputType<{
        processedAt: z.ZodOptional<z.ZodString>;
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
export type DocumentIndex = z.infer<typeof DocumentIndexSchema>;
export declare const SSEEventTypeSchema: z.ZodEnum<["started", "progress", "toc_detected", "node_created", "summary_generated", "entity_extracted", "relation_found", "quote_extracted", "keyword_extracted", "citation_resolved", "knowledge_base_ready", "completed", "error"]>;
export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;
export declare const SSEEventSchema: z.ZodObject<{
    type: z.ZodEnum<["started", "progress", "toc_detected", "node_created", "summary_generated", "entity_extracted", "relation_found", "quote_extracted", "keyword_extracted", "citation_resolved", "knowledge_base_ready", "completed", "error"]>;
    timestamp: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "started" | "progress" | "toc_detected" | "node_created" | "summary_generated" | "entity_extracted" | "relation_found" | "quote_extracted" | "keyword_extracted" | "citation_resolved" | "knowledge_base_ready" | "completed" | "error";
    timestamp: string;
    data?: Record<string, unknown> | undefined;
}, {
    type: "started" | "progress" | "toc_detected" | "node_created" | "summary_generated" | "entity_extracted" | "relation_found" | "quote_extracted" | "keyword_extracted" | "citation_resolved" | "knowledge_base_ready" | "completed" | "error";
    timestamp: string;
    data?: Record<string, unknown> | undefined;
}>;
export type SSEEvent = z.infer<typeof SSEEventSchema>;
export declare const EntityTypeSchema: z.ZodEnum<["person", "date", "place", "concept", "organization", "event", "number", "term"]>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export declare const OccurrenceSchema: z.ZodObject<{
    nodeId: z.ZodString;
    pageNumber: z.ZodNumber;
    position: z.ZodOptional<z.ZodNumber>;
    context: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pageNumber: number;
    nodeId: string;
    position?: number | undefined;
    context?: string | undefined;
}, {
    pageNumber: number;
    nodeId: string;
    position?: number | undefined;
    context?: string | undefined;
}>;
export type Occurrence = z.infer<typeof OccurrenceSchema>;
export declare const EntitySchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["person", "date", "place", "concept", "organization", "event", "number", "term"]>;
    value: z.ZodString;
    normalized: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    occurrences: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        pageNumber: z.ZodNumber;
        position: z.ZodOptional<z.ZodNumber>;
        context: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pageNumber: number;
        nodeId: string;
        position?: number | undefined;
        context?: string | undefined;
    }, {
        pageNumber: number;
        nodeId: string;
        position?: number | undefined;
        context?: string | undefined;
    }>, "many">;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
    id: string;
    occurrences: {
        pageNumber: number;
        nodeId: string;
        position?: number | undefined;
        context?: string | undefined;
    }[];
    description?: string | undefined;
    normalized?: string | undefined;
    confidence?: number | undefined;
}, {
    value: string;
    type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
    id: string;
    occurrences: {
        pageNumber: number;
        nodeId: string;
        position?: number | undefined;
        context?: string | undefined;
    }[];
    description?: string | undefined;
    normalized?: string | undefined;
    confidence?: number | undefined;
}>;
export type Entity = z.infer<typeof EntitySchema>;
export declare const RelationTypeSchema: z.ZodEnum<["references", "contradicts", "supports", "elaborates", "precedes", "follows", "summarizes", "defines", "examples"]>;
export type RelationType = z.infer<typeof RelationTypeSchema>;
export declare const RelationSchema: z.ZodObject<{
    id: z.ZodString;
    sourceNodeId: z.ZodString;
    targetNodeId: z.ZodString;
    type: z.ZodEnum<["references", "contradicts", "supports", "elaborates", "precedes", "follows", "summarizes", "defines", "examples"]>;
    confidence: z.ZodNumber;
    evidence: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
    id: string;
    confidence: number;
    sourceNodeId: string;
    targetNodeId: string;
    evidence?: string | undefined;
}, {
    type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
    id: string;
    confidence: number;
    sourceNodeId: string;
    targetNodeId: string;
    evidence?: string | undefined;
}>;
export type Relation = z.infer<typeof RelationSchema>;
export declare const QuoteSignificanceSchema: z.ZodEnum<["key", "supporting", "notable"]>;
export type QuoteSignificance = z.infer<typeof QuoteSignificanceSchema>;
export declare const QuoteSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
    significance: z.ZodEnum<["key", "supporting", "notable"]>;
    speaker: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    significance: "key" | "supporting" | "notable";
    context?: string | undefined;
    speaker?: string | undefined;
}, {
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    significance: "key" | "supporting" | "notable";
    context?: string | undefined;
    speaker?: string | undefined;
}>;
export type Quote = z.infer<typeof QuoteSchema>;
export declare const KeywordSchema: z.ZodObject<{
    id: z.ZodString;
    term: z.ZodString;
    frequency: z.ZodNumber;
    nodeIds: z.ZodArray<z.ZodString, "many">;
    idf: z.ZodOptional<z.ZodNumber>;
    tfidf: z.ZodOptional<z.ZodNumber>;
    isGlobal: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    term: string;
    frequency: number;
    nodeIds: string[];
    isGlobal: boolean;
    idf?: number | undefined;
    tfidf?: number | undefined;
}, {
    id: string;
    term: string;
    frequency: number;
    nodeIds: string[];
    idf?: number | undefined;
    tfidf?: number | undefined;
    isGlobal?: boolean | undefined;
}>;
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
}, "strip", z.ZodTypeAny, {
    readingTimeMinutes: number;
    totalWords: number;
    totalCharacters: number;
    averageWordsPerPage: number;
    complexityScore: number;
    vocabularyRichness: number;
    sentenceCount: number;
    averageSentenceLength: number;
    paragraphCount: number;
}, {
    readingTimeMinutes: number;
    totalWords: number;
    totalCharacters: number;
    averageWordsPerPage: number;
    complexityScore: number;
    vocabularyRichness: number;
    sentenceCount: number;
    averageSentenceLength: number;
    paragraphCount: number;
}>;
export type DocumentMetrics = z.infer<typeof DocumentMetricsSchema>;
export declare const CitationSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    type: z.ZodEnum<["book", "article", "web", "report", "thesis", "other"]>;
    authors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    title: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    pageNumber: z.ZodNumber;
    nodeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "book" | "article" | "web" | "report" | "thesis" | "other";
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    title?: string | undefined;
    authors?: string[] | undefined;
    year?: number | undefined;
    source?: string | undefined;
}, {
    type: "book" | "article" | "web" | "report" | "thesis" | "other";
    id: string;
    text: string;
    pageNumber: number;
    nodeId: string;
    title?: string | undefined;
    authors?: string[] | undefined;
    year?: number | undefined;
    source?: string | undefined;
}>;
export type Citation = z.infer<typeof CitationSchema>;
export declare const DocumentKnowledgeBaseSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    mimeType: z.ZodString;
    hash: z.ZodString;
    processedAt: z.ZodString;
    totalPages: z.ZodNumber;
    totalTokens: z.ZodNumber;
    tree: z.ZodType<KnowledgeNode, z.ZodTypeDef, KnowledgeNode>;
    entities: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["person", "date", "place", "concept", "organization", "event", "number", "term"]>;
        value: z.ZodString;
        normalized: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        occurrences: z.ZodArray<z.ZodObject<{
            nodeId: z.ZodString;
            pageNumber: z.ZodNumber;
            position: z.ZodOptional<z.ZodNumber>;
            context: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }, {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }>, "many">;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
        id: string;
        occurrences: {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }[];
        description?: string | undefined;
        normalized?: string | undefined;
        confidence?: number | undefined;
    }, {
        value: string;
        type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
        id: string;
        occurrences: {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }[];
        description?: string | undefined;
        normalized?: string | undefined;
        confidence?: number | undefined;
    }>, "many">;
    relations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceNodeId: z.ZodString;
        targetNodeId: z.ZodString;
        type: z.ZodEnum<["references", "contradicts", "supports", "elaborates", "precedes", "follows", "summarizes", "defines", "examples"]>;
        confidence: z.ZodNumber;
        evidence: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
        id: string;
        confidence: number;
        sourceNodeId: string;
        targetNodeId: string;
        evidence?: string | undefined;
    }, {
        type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
        id: string;
        confidence: number;
        sourceNodeId: string;
        targetNodeId: string;
        evidence?: string | undefined;
    }>, "many">;
    keywords: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        term: z.ZodString;
        frequency: z.ZodNumber;
        nodeIds: z.ZodArray<z.ZodString, "many">;
        idf: z.ZodOptional<z.ZodNumber>;
        tfidf: z.ZodOptional<z.ZodNumber>;
        isGlobal: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        term: string;
        frequency: number;
        nodeIds: string[];
        isGlobal: boolean;
        idf?: number | undefined;
        tfidf?: number | undefined;
    }, {
        id: string;
        term: string;
        frequency: number;
        nodeIds: string[];
        idf?: number | undefined;
        tfidf?: number | undefined;
        isGlobal?: boolean | undefined;
    }>, "many">;
    quotes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        pageNumber: z.ZodNumber;
        nodeId: z.ZodString;
        significance: z.ZodEnum<["key", "supporting", "notable"]>;
        speaker: z.ZodOptional<z.ZodString>;
        context: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        significance: "key" | "supporting" | "notable";
        context?: string | undefined;
        speaker?: string | undefined;
    }, {
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        significance: "key" | "supporting" | "notable";
        context?: string | undefined;
        speaker?: string | undefined;
    }>, "many">;
    citations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        type: z.ZodEnum<["book", "article", "web", "report", "thesis", "other"]>;
        authors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        title: z.ZodOptional<z.ZodString>;
        year: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
        pageNumber: z.ZodNumber;
        nodeId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "book" | "article" | "web" | "report" | "thesis" | "other";
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        title?: string | undefined;
        authors?: string[] | undefined;
        year?: number | undefined;
        source?: string | undefined;
    }, {
        type: "book" | "article" | "web" | "report" | "thesis" | "other";
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        title?: string | undefined;
        authors?: string[] | undefined;
        year?: number | undefined;
        source?: string | undefined;
    }>, "many">;
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
    }, "strip", z.ZodTypeAny, {
        readingTimeMinutes: number;
        totalWords: number;
        totalCharacters: number;
        averageWordsPerPage: number;
        complexityScore: number;
        vocabularyRichness: number;
        sentenceCount: number;
        averageSentenceLength: number;
        paragraphCount: number;
    }, {
        readingTimeMinutes: number;
        totalWords: number;
        totalCharacters: number;
        averageWordsPerPage: number;
        complexityScore: number;
        vocabularyRichness: number;
        sentenceCount: number;
        averageSentenceLength: number;
        paragraphCount: number;
    }>;
    description: z.ZodString;
    keyInsights: z.ZodArray<z.ZodString, "many">;
    processingMetadata: z.ZodOptional<z.ZodObject<{
        modelUsed: z.ZodOptional<z.ZodString>;
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
        version: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version: string;
        modelUsed?: string | undefined;
        processingTimeMs?: number | undefined;
    }, {
        modelUsed?: string | undefined;
        processingTimeMs?: number | undefined;
        version?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    entities: {
        value: string;
        type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
        id: string;
        occurrences: {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }[];
        description?: string | undefined;
        normalized?: string | undefined;
        confidence?: number | undefined;
    }[];
    keywords: {
        id: string;
        term: string;
        frequency: number;
        nodeIds: string[];
        isGlobal: boolean;
        idf?: number | undefined;
        tfidf?: number | undefined;
    }[];
    quotes: {
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        significance: "key" | "supporting" | "notable";
        context?: string | undefined;
        speaker?: string | undefined;
    }[];
    metrics: {
        readingTimeMinutes: number;
        totalWords: number;
        totalCharacters: number;
        averageWordsPerPage: number;
        complexityScore: number;
        vocabularyRichness: number;
        sentenceCount: number;
        averageSentenceLength: number;
        paragraphCount: number;
    };
    description: string;
    totalPages: number;
    tree: KnowledgeNode;
    processedAt: string;
    filename: string;
    mimeType: string;
    hash: string;
    totalTokens: number;
    relations: {
        type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
        id: string;
        confidence: number;
        sourceNodeId: string;
        targetNodeId: string;
        evidence?: string | undefined;
    }[];
    citations: {
        type: "book" | "article" | "web" | "report" | "thesis" | "other";
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        title?: string | undefined;
        authors?: string[] | undefined;
        year?: number | undefined;
        source?: string | undefined;
    }[];
    keyInsights: string[];
    processingMetadata?: {
        version: string;
        modelUsed?: string | undefined;
        processingTimeMs?: number | undefined;
    } | undefined;
}, {
    id: string;
    entities: {
        value: string;
        type: "number" | "date" | "person" | "place" | "concept" | "organization" | "event" | "term";
        id: string;
        occurrences: {
            pageNumber: number;
            nodeId: string;
            position?: number | undefined;
            context?: string | undefined;
        }[];
        description?: string | undefined;
        normalized?: string | undefined;
        confidence?: number | undefined;
    }[];
    keywords: {
        id: string;
        term: string;
        frequency: number;
        nodeIds: string[];
        idf?: number | undefined;
        tfidf?: number | undefined;
        isGlobal?: boolean | undefined;
    }[];
    quotes: {
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        significance: "key" | "supporting" | "notable";
        context?: string | undefined;
        speaker?: string | undefined;
    }[];
    metrics: {
        readingTimeMinutes: number;
        totalWords: number;
        totalCharacters: number;
        averageWordsPerPage: number;
        complexityScore: number;
        vocabularyRichness: number;
        sentenceCount: number;
        averageSentenceLength: number;
        paragraphCount: number;
    };
    description: string;
    totalPages: number;
    tree: KnowledgeNode;
    processedAt: string;
    filename: string;
    mimeType: string;
    hash: string;
    totalTokens: number;
    relations: {
        type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
        id: string;
        confidence: number;
        sourceNodeId: string;
        targetNodeId: string;
        evidence?: string | undefined;
    }[];
    citations: {
        type: "book" | "article" | "web" | "report" | "thesis" | "other";
        id: string;
        text: string;
        pageNumber: number;
        nodeId: string;
        title?: string | undefined;
        authors?: string[] | undefined;
        year?: number | undefined;
        source?: string | undefined;
    }[];
    keyInsights: string[];
    processingMetadata?: {
        modelUsed?: string | undefined;
        processingTimeMs?: number | undefined;
        version?: string | undefined;
    } | undefined;
}>;
export type DocumentKnowledgeBase = z.infer<typeof DocumentKnowledgeBaseSchema>;
export declare const AnswerSourceSchema: z.ZodObject<{
    nodeId: z.ZodString;
    pageNumber: z.ZodNumber;
    excerpt: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pageNumber: number;
    nodeId: string;
    confidence: number;
    excerpt: string;
}, {
    pageNumber: number;
    nodeId: string;
    confidence: number;
    excerpt: string;
}>;
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
    }, "strip", z.ZodTypeAny, {
        pageNumber: number;
        nodeId: string;
        confidence: number;
        excerpt: string;
    }, {
        pageNumber: number;
        nodeId: string;
        confidence: number;
        excerpt: string;
    }>, "many">;
    confidence: z.ZodNumber;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    confidence: number;
    question: string;
    answer: string;
    sources: {
        pageNumber: number;
        nodeId: string;
        confidence: number;
        excerpt: string;
    }[];
    generatedAt: string;
}, {
    id: string;
    confidence: number;
    question: string;
    answer: string;
    sources: {
        pageNumber: number;
        nodeId: string;
        confidence: number;
        excerpt: string;
    }[];
    generatedAt: string;
}>;
export type Answer = z.infer<typeof AnswerSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map