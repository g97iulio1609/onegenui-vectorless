import { describe, it, expect } from "vitest";
import { EntitySchema, RelationSchema, QuoteSchema, KeywordSchema, CitationSchema, KnowledgeNodeSchema, AnswerSchema, OccurrenceSchema, DocumentMetricsSchema, EntityTypeSchema, RelationTypeSchema, QuoteSignificanceSchema, } from "../domain/schemas.js";
describe("Domain Schemas", () => {
    describe("EntityTypeSchema", () => {
        it("should validate valid entity types", () => {
            expect(EntityTypeSchema.parse("person")).toBe("person");
            expect(EntityTypeSchema.parse("date")).toBe("date");
            expect(EntityTypeSchema.parse("place")).toBe("place");
            expect(EntityTypeSchema.parse("concept")).toBe("concept");
            expect(EntityTypeSchema.parse("organization")).toBe("organization");
            expect(EntityTypeSchema.parse("event")).toBe("event");
            expect(EntityTypeSchema.parse("number")).toBe("number");
            expect(EntityTypeSchema.parse("term")).toBe("term");
        });
        it("should reject invalid entity types", () => {
            expect(() => EntityTypeSchema.parse("invalid")).toThrow();
        });
    });
    describe("OccurrenceSchema", () => {
        it("should validate a complete occurrence", () => {
            const occurrence = {
                nodeId: "node-1",
                pageNumber: 5,
                position: 100,
                context: "Some surrounding text",
            };
            expect(OccurrenceSchema.parse(occurrence)).toEqual(occurrence);
        });
        it("should validate minimal occurrence", () => {
            const occurrence = {
                nodeId: "node-1",
                pageNumber: 1,
            };
            expect(OccurrenceSchema.parse(occurrence)).toEqual(occurrence);
        });
        it("should reject invalid page numbers", () => {
            expect(() => OccurrenceSchema.parse({ nodeId: "n", pageNumber: 0 })).toThrow();
        });
    });
    describe("EntitySchema", () => {
        it("should validate a complete entity", () => {
            const entity = {
                id: "entity-1",
                type: "person",
                value: "John Smith",
                normalized: "john smith",
                description: "A person mentioned in the document",
                occurrences: [{ nodeId: "n1", pageNumber: 1 }],
                confidence: 0.95,
            };
            const result = EntitySchema.parse(entity);
            expect(result.id).toBe("entity-1");
            expect(result.type).toBe("person");
            expect(result.value).toBe("John Smith");
        });
        it("should validate minimal entity", () => {
            const entity = {
                id: "entity-1",
                type: "concept",
                value: "Machine Learning",
                occurrences: [],
            };
            const result = EntitySchema.parse(entity);
            expect(result.id).toBe("entity-1");
        });
        it("should reject invalid confidence values", () => {
            const entity = {
                id: "entity-1",
                type: "person",
                value: "John",
                occurrences: [],
                confidence: 1.5, // > 1
            };
            expect(() => EntitySchema.parse(entity)).toThrow();
        });
    });
    describe("RelationTypeSchema", () => {
        it("should validate valid relation types", () => {
            expect(RelationTypeSchema.parse("references")).toBe("references");
            expect(RelationTypeSchema.parse("supports")).toBe("supports");
            expect(RelationTypeSchema.parse("contradicts")).toBe("contradicts");
        });
    });
    describe("RelationSchema", () => {
        it("should validate a complete relation", () => {
            const relation = {
                id: "rel-1",
                sourceNodeId: "node-1",
                targetNodeId: "node-2",
                type: "supports",
                confidence: 0.8,
                evidence: "The text explicitly states support",
            };
            const result = RelationSchema.parse(relation);
            expect(result.id).toBe("rel-1");
            expect(result.type).toBe("supports");
        });
        it("should validate relation without evidence", () => {
            const relation = {
                id: "rel-1",
                sourceNodeId: "node-1",
                targetNodeId: "node-2",
                type: "references",
                confidence: 0.9,
            };
            expect(RelationSchema.parse(relation)).toEqual(relation);
        });
    });
    describe("QuoteSignificanceSchema", () => {
        it("should validate valid significance values", () => {
            expect(QuoteSignificanceSchema.parse("key")).toBe("key");
            expect(QuoteSignificanceSchema.parse("supporting")).toBe("supporting");
            expect(QuoteSignificanceSchema.parse("notable")).toBe("notable");
        });
    });
    describe("QuoteSchema", () => {
        it("should validate a complete quote", () => {
            const quote = {
                id: "quote-1",
                text: "This is an important quote from the document.",
                pageNumber: 10,
                nodeId: "node-5",
                significance: "key",
                speaker: "Dr. Smith",
                context: "During the conclusion",
            };
            const result = QuoteSchema.parse(quote);
            expect(result.id).toBe("quote-1");
            expect(result.significance).toBe("key");
        });
        it("should validate minimal quote", () => {
            const quote = {
                id: "quote-1",
                text: "A quote",
                pageNumber: 1,
                nodeId: "node-1",
                significance: "notable",
            };
            expect(QuoteSchema.parse(quote)).toEqual(quote);
        });
    });
    describe("KeywordSchema", () => {
        it("should validate a complete keyword", () => {
            const keyword = {
                id: "kw-1",
                term: "machine learning",
                frequency: 15,
                nodeIds: ["node-1", "node-2", "node-3"],
                idf: 2.5,
                tfidf: 0.85,
                isGlobal: true,
            };
            const result = KeywordSchema.parse(keyword);
            expect(result.term).toBe("machine learning");
            expect(result.isGlobal).toBe(true);
        });
        it("should reject frequency less than 1", () => {
            expect(() => KeywordSchema.parse({
                id: "k",
                term: "test",
                frequency: 0,
                nodeIds: [],
            })).toThrow();
        });
    });
    describe("DocumentMetricsSchema", () => {
        it("should validate complete metrics", () => {
            const metrics = {
                totalWords: 10000,
                totalCharacters: 50000,
                averageWordsPerPage: 500,
                readingTimeMinutes: 40,
                complexityScore: 65,
                vocabularyRichness: 0.7,
                sentenceCount: 400,
                averageSentenceLength: 25,
                paragraphCount: 80,
            };
            const result = DocumentMetricsSchema.parse(metrics);
            expect(result.totalWords).toBe(10000);
            expect(result.complexityScore).toBe(65);
        });
        it("should reject complexity score above 100", () => {
            expect(() => DocumentMetricsSchema.parse({
                totalWords: 100,
                totalCharacters: 500,
                averageWordsPerPage: 100,
                readingTimeMinutes: 1,
                complexityScore: 150,
                vocabularyRichness: 0.5,
                sentenceCount: 5,
                averageSentenceLength: 20,
                paragraphCount: 2,
            })).toThrow();
        });
    });
    describe("CitationSchema", () => {
        it("should validate a complete citation", () => {
            const citation = {
                id: "cit-1",
                text: "Smith, J. (2020). Machine Learning. Journal of AI.",
                type: "article",
                authors: ["Smith, J."],
                title: "Machine Learning",
                year: 2020,
                source: "Journal of AI",
                pageNumber: 25,
                nodeId: "node-10",
            };
            const result = CitationSchema.parse(citation);
            expect(result.type).toBe("article");
            expect(result.year).toBe(2020);
        });
        it("should validate minimal citation", () => {
            const citation = {
                id: "cit-1",
                text: "Some reference",
                type: "other",
                pageNumber: 1,
                nodeId: "node-1",
            };
            expect(CitationSchema.parse(citation)).toEqual(citation);
        });
    });
    describe("AnswerSchema", () => {
        it("should validate a complete answer", () => {
            const answer = {
                id: "ans-1",
                question: "What is machine learning?",
                answer: "Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
                sources: [
                    {
                        nodeId: "node-5",
                        pageNumber: 10,
                        excerpt: "Machine learning is defined as...",
                        confidence: 0.9,
                    },
                ],
                confidence: 0.85,
                generatedAt: new Date().toISOString(),
            };
            const result = AnswerSchema.parse(answer);
            expect(result.question).toBe("What is machine learning?");
            expect(result.sources).toHaveLength(1);
        });
        it("should validate answer with empty sources", () => {
            const answer = {
                id: "ans-1",
                question: "Unknown question",
                answer: "Could not find relevant information.",
                sources: [],
                confidence: 0.1,
                generatedAt: new Date().toISOString(),
            };
            expect(AnswerSchema.parse(answer)).toEqual(answer);
        });
    });
    describe("KnowledgeNodeSchema", () => {
        it("should validate a leaf node", () => {
            const node = {
                id: "node-1",
                title: "Introduction",
                level: 1,
                pageStart: 1,
                pageEnd: 5,
                summary: "This section introduces the topic.",
                keyPoints: ["Point 1", "Point 2"],
                entities: [],
                keywords: ["introduction", "overview"],
                quotes: [],
                internalRefs: [],
                externalRefs: [],
                children: [],
            };
            const result = KnowledgeNodeSchema.parse(node);
            expect(result.title).toBe("Introduction");
            expect(result.children).toHaveLength(0);
        });
        it("should validate nested nodes", () => {
            const node = {
                id: "root",
                title: "Document",
                level: 0,
                pageStart: 1,
                pageEnd: 100,
                summary: "Full document summary",
                keyPoints: [],
                entities: [{ entityId: "e1" }],
                keywords: [],
                quotes: [],
                internalRefs: [],
                externalRefs: [],
                children: [
                    {
                        id: "child-1",
                        title: "Chapter 1",
                        level: 1,
                        pageStart: 1,
                        pageEnd: 50,
                        summary: "Chapter 1 summary",
                        keyPoints: [],
                        entities: [],
                        keywords: [],
                        quotes: [],
                        internalRefs: [],
                        externalRefs: [],
                        children: [],
                    },
                ],
            };
            const result = KnowledgeNodeSchema.parse(node);
            expect(result.children).toHaveLength(1);
            expect(result.children?.[0]?.title).toBe("Chapter 1");
        });
    });
});
//# sourceMappingURL=schemas.test.js.map