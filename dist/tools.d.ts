import { z } from "zod";
import type { LanguageModel } from "ai";
import { type VectorlessIndexResult, type KnowledgeBaseResult } from "./index.js";
import type { Answer } from "./domain/schemas.js";
export declare function setVectorlessModel(model: LanguageModel): void;
export declare const pdfIndexParamsSchema: z.ZodObject<{
    pdfUrl: z.ZodOptional<z.ZodString>;
    pdfBase64: z.ZodOptional<z.ZodString>;
    addSummaries: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    addDescription: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    verifyToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    fixIncorrectToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    processLargeNodes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    addSummaries: boolean;
    addDescription: boolean;
    verifyToc: boolean;
    fixIncorrectToc: boolean;
    processLargeNodes: boolean;
    pdfUrl?: string | undefined;
    pdfBase64?: string | undefined;
}, {
    addSummaries?: boolean | undefined;
    addDescription?: boolean | undefined;
    verifyToc?: boolean | undefined;
    fixIncorrectToc?: boolean | undefined;
    processLargeNodes?: boolean | undefined;
    pdfUrl?: string | undefined;
    pdfBase64?: string | undefined;
}>;
export type PdfIndexParams = z.infer<typeof pdfIndexParamsSchema>;
export declare const pdfIndexToolDefinition: {
    name: "pdf-index";
    description: string;
    parameters: z.ZodObject<{
        pdfUrl: z.ZodOptional<z.ZodString>;
        pdfBase64: z.ZodOptional<z.ZodString>;
        addSummaries: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        addDescription: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        verifyToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        fixIncorrectToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        processLargeNodes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        addSummaries: boolean;
        addDescription: boolean;
        verifyToc: boolean;
        fixIncorrectToc: boolean;
        processLargeNodes: boolean;
        pdfUrl?: string | undefined;
        pdfBase64?: string | undefined;
    }, {
        addSummaries?: boolean | undefined;
        addDescription?: boolean | undefined;
        verifyToc?: boolean | undefined;
        fixIncorrectToc?: boolean | undefined;
        processLargeNodes?: boolean | undefined;
        pdfUrl?: string | undefined;
        pdfBase64?: string | undefined;
    }>;
    domain: "document";
    tags: string[];
};
export declare function executePdfIndex(params: PdfIndexParams): Promise<VectorlessIndexResult>;
export declare const knowledgeBaseParamsSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    base64Content: z.ZodOptional<z.ZodString>;
    filename: z.ZodString;
    mimeType: z.ZodDefault<z.ZodString>;
    extractEntities: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    extractRelations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    extractQuotes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    extractKeywords: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    extractCitations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    filename: string;
    mimeType: string;
    extractEntities: boolean;
    extractRelations: boolean;
    extractQuotes: boolean;
    extractKeywords: boolean;
    extractCitations: boolean;
    url?: string | undefined;
    base64Content?: string | undefined;
}, {
    filename: string;
    mimeType?: string | undefined;
    extractEntities?: boolean | undefined;
    extractRelations?: boolean | undefined;
    extractQuotes?: boolean | undefined;
    extractKeywords?: boolean | undefined;
    extractCitations?: boolean | undefined;
    url?: string | undefined;
    base64Content?: string | undefined;
}>;
export type KnowledgeBaseParams = z.infer<typeof knowledgeBaseParamsSchema>;
export declare const knowledgeBaseToolDefinition: {
    name: "generate-knowledge-base";
    description: string;
    parameters: z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        base64Content: z.ZodOptional<z.ZodString>;
        filename: z.ZodString;
        mimeType: z.ZodDefault<z.ZodString>;
        extractEntities: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        extractRelations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        extractQuotes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        extractKeywords: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        extractCitations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        mimeType: string;
        extractEntities: boolean;
        extractRelations: boolean;
        extractQuotes: boolean;
        extractKeywords: boolean;
        extractCitations: boolean;
        url?: string | undefined;
        base64Content?: string | undefined;
    }, {
        filename: string;
        mimeType?: string | undefined;
        extractEntities?: boolean | undefined;
        extractRelations?: boolean | undefined;
        extractQuotes?: boolean | undefined;
        extractKeywords?: boolean | undefined;
        extractCitations?: boolean | undefined;
        url?: string | undefined;
        base64Content?: string | undefined;
    }>;
    domain: "document";
    tags: string[];
};
export declare function executeKnowledgeBase(params: KnowledgeBaseParams): Promise<KnowledgeBaseResult>;
export declare const questionAnswerParamsSchema: z.ZodObject<{
    question: z.ZodString;
    knowledgeBaseId: z.ZodString;
    maxSources: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    minConfidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    question: string;
    knowledgeBaseId: string;
    maxSources: number;
    minConfidence: number;
}, {
    question: string;
    knowledgeBaseId: string;
    maxSources?: number | undefined;
    minConfidence?: number | undefined;
}>;
export type QuestionAnswerParams = z.infer<typeof questionAnswerParamsSchema>;
export declare const questionAnswerToolDefinition: {
    name: "answer-question";
    description: string;
    parameters: z.ZodObject<{
        question: z.ZodString;
        knowledgeBaseId: z.ZodString;
        maxSources: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        minConfidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        question: string;
        knowledgeBaseId: string;
        maxSources: number;
        minConfidence: number;
    }, {
        question: string;
        knowledgeBaseId: string;
        maxSources?: number | undefined;
        minConfidence?: number | undefined;
    }>;
    domain: "document";
    tags: string[];
};
export declare function executeQuestionAnswer(params: QuestionAnswerParams): Promise<{
    answer: Answer;
}>;
export declare const listKnowledgeBasesParamsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const listKnowledgeBasesToolDefinition: {
    name: "list-knowledge-bases";
    description: string;
    parameters: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    domain: "document";
    tags: string[];
};
export declare function executeListKnowledgeBases(): Promise<{
    knowledgeBases: {
        id: string;
        filename: string;
        processedAt: string;
    }[];
}>;
export declare function createPdfIndexMcpTool<T>(defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: PdfIndexParams) => Promise<VectorlessIndexResult>;
}) => T): T;
export declare function createKnowledgeBaseMcpTool<T>(defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: KnowledgeBaseParams) => Promise<KnowledgeBaseResult>;
}) => T): T;
export declare function createQuestionAnswerMcpTool<T>(defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: QuestionAnswerParams) => Promise<{
        answer: Answer;
    }>;
}) => T): T;
export declare const vectorlessTools: {
    "pdf-index": {
        execute: typeof executePdfIndex;
        name: "pdf-index";
        description: string;
        parameters: z.ZodObject<{
            pdfUrl: z.ZodOptional<z.ZodString>;
            pdfBase64: z.ZodOptional<z.ZodString>;
            addSummaries: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            addDescription: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            verifyToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            fixIncorrectToc: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            processLargeNodes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            addSummaries: boolean;
            addDescription: boolean;
            verifyToc: boolean;
            fixIncorrectToc: boolean;
            processLargeNodes: boolean;
            pdfUrl?: string | undefined;
            pdfBase64?: string | undefined;
        }, {
            addSummaries?: boolean | undefined;
            addDescription?: boolean | undefined;
            verifyToc?: boolean | undefined;
            fixIncorrectToc?: boolean | undefined;
            processLargeNodes?: boolean | undefined;
            pdfUrl?: string | undefined;
            pdfBase64?: string | undefined;
        }>;
        domain: "document";
        tags: string[];
    };
    "generate-knowledge-base": {
        execute: typeof executeKnowledgeBase;
        name: "generate-knowledge-base";
        description: string;
        parameters: z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            base64Content: z.ZodOptional<z.ZodString>;
            filename: z.ZodString;
            mimeType: z.ZodDefault<z.ZodString>;
            extractEntities: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            extractRelations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            extractQuotes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            extractKeywords: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            extractCitations: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            filename: string;
            mimeType: string;
            extractEntities: boolean;
            extractRelations: boolean;
            extractQuotes: boolean;
            extractKeywords: boolean;
            extractCitations: boolean;
            url?: string | undefined;
            base64Content?: string | undefined;
        }, {
            filename: string;
            mimeType?: string | undefined;
            extractEntities?: boolean | undefined;
            extractRelations?: boolean | undefined;
            extractQuotes?: boolean | undefined;
            extractKeywords?: boolean | undefined;
            extractCitations?: boolean | undefined;
            url?: string | undefined;
            base64Content?: string | undefined;
        }>;
        domain: "document";
        tags: string[];
    };
    "answer-question": {
        execute: typeof executeQuestionAnswer;
        name: "answer-question";
        description: string;
        parameters: z.ZodObject<{
            question: z.ZodString;
            knowledgeBaseId: z.ZodString;
            maxSources: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            minConfidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            question: string;
            knowledgeBaseId: string;
            maxSources: number;
            minConfidence: number;
        }, {
            question: string;
            knowledgeBaseId: string;
            maxSources?: number | undefined;
            minConfidence?: number | undefined;
        }>;
        domain: "document";
        tags: string[];
    };
    "list-knowledge-bases": {
        execute: typeof executeListKnowledgeBases;
        name: "list-knowledge-bases";
        description: string;
        parameters: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        domain: "document";
        tags: string[];
    };
};
//# sourceMappingURL=tools.d.ts.map