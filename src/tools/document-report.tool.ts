/**
 * Document Report MCP Tool
 * Streaming document analysis with JSON Patches for frontend rendering
 */
import { z } from "zod";
import type { LanguageModel } from "ai";
import { GenerateDocumentReportUseCase, type GenerateDocumentReportResult } from "../use-cases/generate-document-report.js";
import { MemoryCacheAdapter, UnifiedDocumentParser } from "../infrastructure/index.js";
import type { DocumentReportEvent } from "../domain/document-report.schema.js";

let configuredModel: LanguageModel | null = null;
const globalCache = new MemoryCacheAdapter();

export function setDocumentReportModel(model: LanguageModel): void {
  configuredModel = model;
}

function getModel(): LanguageModel {
  if (!configuredModel) {
    throw new Error("Document report model not configured. Call setDocumentReportModel() first.");
  }
  return configuredModel;
}

export const documentReportParamsSchema = z.object({
  url: z.string().url().optional().describe("URL of the document to analyze"),
  base64Content: z.string().optional().describe("Base64-encoded document content"),
  filename: z.string().optional().describe("Original filename"),
  mimeType: z.string().default("application/pdf").describe("Document MIME type"),
  includeSemanticOverlay: z.boolean().optional().default(true).describe("Include semantic analysis overlay"),
  generateTimeline: z.boolean().optional().default(true).describe("Generate timeline from date entities"),
  generateConceptMap: z.boolean().optional().default(false).describe("Generate concept relationship map"),
});

export type DocumentReportParams = z.infer<typeof documentReportParamsSchema>;

export const documentReportToolDefinition = {
  name: "document-report" as const,
  description:
    "Generate a comprehensive document analysis report with streaming UI patches. " +
    "Produces detailed section summaries, key points, entities, quotes, relations, and global insights. " +
    "Streams patches for real-time frontend rendering like ResearchReport.",
  parameters: documentReportParamsSchema,
  domain: "document" as const,
  tags: ["document", "report", "analysis", "streaming", "entities", "summary"],
};

export interface DocumentReportToolOptions {
  onEvent?: (event: DocumentReportEvent) => void;
  onPatch?: (patch: string) => void;
}

export async function executeDocumentReport(
  params: DocumentReportParams,
  options: DocumentReportToolOptions = {},
): Promise<GenerateDocumentReportResult> {
  const { url, base64Content, filename, mimeType, ...reportOptions } = params;

  if (!url && !base64Content) {
    throw new Error("Either url or base64Content must be provided");
  }

  const model = getModel();
  let buffer: ArrayBuffer;

  if (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
    buffer = await response.arrayBuffer();
  } else {
    const binaryString = atob(base64Content!);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  }

  const parser = new UnifiedDocumentParser();
  const useCase = new GenerateDocumentReportUseCase({
    parser,
    cache: globalCache,
    model,
    onEvent: options.onEvent,
    onPatch: options.onPatch,
  });

  return useCase.execute({
    buffer,
    filename: filename || "document",
    mimeType,
    options: reportOptions,
  });
}

export function createDocumentReportMcpTool<T>(
  defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: DocumentReportParams, options?: DocumentReportToolOptions) => Promise<GenerateDocumentReportResult>;
  }) => T,
): T {
  return defineMcpTool({
    ...documentReportToolDefinition,
    execute: executeDocumentReport,
  });
}
