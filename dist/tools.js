// =============================================================================
// @onegenui/vectorless - MCP Tool Definitions
// =============================================================================
//
// This module provides MCP tool definitions for the Vectorless document indexing
// and knowledge extraction functionality.
import { z } from "zod";
import { generateDocumentIndex, generateKnowledgeBase, } from "./index.js";
import { AnswerQuestionUseCase } from "./use-cases/answer-question.js";
import { MemoryCacheAdapter, MemoryKnowledgeBaseRepository, } from "./infrastructure/index.js";
// -----------------------------------------------------------------------------
// Model Configuration
// -----------------------------------------------------------------------------
let configuredModel = null;
const globalCache = new MemoryCacheAdapter();
const globalKbRepository = new MemoryKnowledgeBaseRepository();
export function setVectorlessModel(model) {
    configuredModel = model;
}
function getModel() {
    if (!configuredModel) {
        throw new Error("Vectorless model not configured. Call setVectorlessModel() first.");
    }
    return configuredModel;
}
// -----------------------------------------------------------------------------
// PDF Index Tool
// -----------------------------------------------------------------------------
export const pdfIndexParamsSchema = z.object({
    pdfUrl: z.string().url().optional(),
    pdfBase64: z.string().optional(),
    addSummaries: z.boolean().optional().default(true),
    addDescription: z.boolean().optional().default(true),
    verifyToc: z.boolean().optional().default(true),
    fixIncorrectToc: z.boolean().optional().default(true),
    processLargeNodes: z.boolean().optional().default(true),
});
export const pdfIndexToolDefinition = {
    name: "pdf-index",
    description: "Analyze a PDF document and generate a structured index with TOC and summaries.",
    parameters: pdfIndexParamsSchema,
    domain: "document",
    tags: ["pdf", "document", "index", "toc", "structure"],
};
export async function executePdfIndex(params) {
    const { pdfUrl, pdfBase64, ...options } = params;
    if (!pdfUrl && !pdfBase64) {
        throw new Error("Either pdfUrl or pdfBase64 must be provided");
    }
    const model = getModel();
    let pdfBuffer;
    if (pdfUrl) {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
        }
        pdfBuffer = await response.arrayBuffer();
    }
    else {
        const binaryString = atob(pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        pdfBuffer = bytes.buffer;
    }
    return generateDocumentIndex(pdfBuffer, { model, ...options });
}
// -----------------------------------------------------------------------------
// Knowledge Base Generation Tool
// -----------------------------------------------------------------------------
export const knowledgeBaseParamsSchema = z.object({
    url: z.string().url().optional(),
    base64Content: z.string().optional(),
    filename: z.string(),
    mimeType: z.string().default("application/pdf"),
    extractEntities: z.boolean().optional().default(true),
    extractRelations: z.boolean().optional().default(true),
    extractQuotes: z.boolean().optional().default(true),
    extractKeywords: z.boolean().optional().default(true),
    extractCitations: z.boolean().optional().default(true),
});
export const knowledgeBaseToolDefinition = {
    name: "generate-knowledge-base",
    description: "Generate a comprehensive knowledge base from a document. " +
        "Extracts entities, relations, quotes, keywords, and citations. " +
        "Supports PDF, Word, Excel, and Markdown files.",
    parameters: knowledgeBaseParamsSchema,
    domain: "document",
    tags: ["knowledge-base", "extraction", "entities", "relations", "document"],
};
export async function executeKnowledgeBase(params) {
    const { url, base64Content, filename, mimeType, ...options } = params;
    if (!url && !base64Content) {
        throw new Error("Either url or base64Content must be provided");
    }
    const model = getModel();
    let buffer;
    if (url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status}`);
        }
        buffer = await response.arrayBuffer();
    }
    else {
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = bytes.buffer;
    }
    const result = await generateKnowledgeBase(buffer, filename, mimeType, {
        model,
        ...options,
    });
    // Store in repository for later Q&A
    await globalKbRepository.save(result.knowledgeBase);
    return result;
}
// -----------------------------------------------------------------------------
// Question-Answer Tool
// -----------------------------------------------------------------------------
export const questionAnswerParamsSchema = z.object({
    question: z.string().describe("The question to answer"),
    knowledgeBaseId: z.string().describe("ID of the knowledge base to query"),
    maxSources: z.number().int().min(1).max(10).optional().default(5),
    minConfidence: z.number().min(0).max(1).optional().default(0.3),
});
export const questionAnswerToolDefinition = {
    name: "answer-question",
    description: "Answer a question using a previously generated knowledge base. " +
        "Returns the answer with source citations and confidence scores.",
    parameters: questionAnswerParamsSchema,
    domain: "document",
    tags: ["qa", "question", "answer", "knowledge-base", "citation"],
};
export async function executeQuestionAnswer(params) {
    const model = getModel();
    const useCase = new AnswerQuestionUseCase({
        cache: globalCache,
        kbRepository: globalKbRepository,
        model,
    });
    return useCase.execute(params);
}
// -----------------------------------------------------------------------------
// List Knowledge Bases Tool
// -----------------------------------------------------------------------------
export const listKnowledgeBasesParamsSchema = z.object({});
export const listKnowledgeBasesToolDefinition = {
    name: "list-knowledge-bases",
    description: "List all available knowledge bases that can be queried.",
    parameters: listKnowledgeBasesParamsSchema,
    domain: "document",
    tags: ["knowledge-base", "list"],
};
export async function executeListKnowledgeBases() {
    const list = await globalKbRepository.list();
    return { knowledgeBases: list };
}
// -----------------------------------------------------------------------------
// MCP Tool Factory
// -----------------------------------------------------------------------------
export function createPdfIndexMcpTool(defineMcpTool) {
    return defineMcpTool({
        ...pdfIndexToolDefinition,
        execute: executePdfIndex,
    });
}
export function createKnowledgeBaseMcpTool(defineMcpTool) {
    return defineMcpTool({
        ...knowledgeBaseToolDefinition,
        execute: executeKnowledgeBase,
    });
}
export function createQuestionAnswerMcpTool(defineMcpTool) {
    return defineMcpTool({
        ...questionAnswerToolDefinition,
        execute: executeQuestionAnswer,
    });
}
// -----------------------------------------------------------------------------
// All Tools Export
// -----------------------------------------------------------------------------
export const vectorlessTools = {
    "pdf-index": {
        ...pdfIndexToolDefinition,
        execute: executePdfIndex,
    },
    "generate-knowledge-base": {
        ...knowledgeBaseToolDefinition,
        execute: executeKnowledgeBase,
    },
    "answer-question": {
        ...questionAnswerToolDefinition,
        execute: executeQuestionAnswer,
    },
    "list-knowledge-bases": {
        ...listKnowledgeBasesToolDefinition,
        execute: executeListKnowledgeBases,
    },
};
//# sourceMappingURL=tools.js.map