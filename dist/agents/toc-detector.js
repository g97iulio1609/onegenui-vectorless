import { ToolLoopAgent, tool, stepCountIs, Output, } from "ai";
import { z } from "zod";
import { TocEntrySchema } from "../domain/schemas.js";
import { createSessionLogger, } from "../infrastructure/logger.js";
const TocDetectionOutputSchema = z.object({
    hasToc: z.boolean().describe("Whether a table of contents was found"),
    tocEndPage: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Page where TOC ends"),
    entries: z.array(TocEntrySchema).describe("Detected TOC entries"),
});
export function createTocDetectorAgent(model, logger) {
    const log = logger || createSessionLogger(`toc-${Date.now()}`);
    return {
        async *detectToc(pages) {
            const timestamp = () => new Date().toISOString();
            log.info("TOC", "Starting TOC detection", { totalPages: pages.length });
            yield {
                event: {
                    type: "started",
                    timestamp: timestamp(),
                    data: { step: "toc_detection", totalPages: pages.length },
                },
            };
            // Build page content map for tool access
            const pageContentMap = new Map();
            for (const page of pages) {
                pageContentMap.set(page.pageNumber, page.content);
            }
            const jsonExampleWithToc = `{
  "hasToc": true,
  "tocEndPage": 3,
  "entries": [
    {"title": "Introduction", "pageNumber": 5, "level": 0},
    {"title": "Background", "pageNumber": 5, "level": 1},
    {"title": "Methods", "pageNumber": 15, "level": 0},
    {"title": "Results", "pageNumber": 25, "level": 0}
  ]
}`;
            const jsonExampleNoToc = `{
  "hasToc": false,
  "entries": []
}`;
            const agent = new ToolLoopAgent({
                model: model,
                instructions: `You are an expert at detecting Table of Contents in documents.

WORKFLOW:
1. Review the sample pages provided in the prompt
2. Optionally use analyzePage tool to check additional pages
3. Generate the final JSON output

EXPECTED JSON FORMAT (if TOC found):
${jsonExampleWithToc}

EXPECTED JSON FORMAT (if NO TOC found):
${jsonExampleNoToc}

RULES:
- hasToc: true if document has a table of contents, false otherwise
- tocEndPage: The page number where TOC ends (only if hasToc is true)
- entries: Array of TOC entries with title, pageNumber, and level
- level: 0 = main chapters, 1 = sub-sections, 2 = sub-sub-sections
- pageNumber: The page number as shown in the TOC

After analyzing, output ONLY the JSON object. Do not include any other text.`,
                output: Output.object({ schema: TocDetectionOutputSchema }),
                tools: {
                    analyzePage: tool({
                        description: "Analyze a page to check for TOC content. Call this to examine pages not in the initial sample.",
                        inputSchema: z.object({
                            pageNumber: z
                                .number()
                                .int()
                                .min(1)
                                .describe("Page number to analyze"),
                        }),
                        execute: async ({ pageNumber }) => {
                            const content = pageContentMap.get(pageNumber);
                            if (!content) {
                                return { error: `Page ${pageNumber} not found`, content: "" };
                            }
                            log.debug("TOC", `Tool analyzePage called for page ${pageNumber}`);
                            return {
                                pageNumber,
                                content: content.slice(0, 4000),
                                hasTocIndicators: content.includes("Contents") ||
                                    content.includes("INDEX") ||
                                    content.includes("INDICE") ||
                                    /\.\.\.\s*\d+/.test(content) ||
                                    /\.{3,}\s*\d+/.test(content),
                            };
                        },
                    }),
                },
                stopWhen: stepCountIs(500),
            });
            // Provide first pages as initial context
            const firstPages = pages.slice(0, 10);
            const pagesContent = firstPages
                .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.content.slice(0, 2000)}`)
                .join("\n\n");
            yield {
                event: {
                    type: "progress",
                    timestamp: timestamp(),
                    data: {
                        step: "toc_detection",
                        progress: 1,
                        message: "Scanning for table of contents...",
                    },
                },
            };
            // Use stream() with ToolLoopAgent - consume textStream first, then await output
            log.info("TOC", "Starting agent.stream()");
            const prompt = `Analyze these document pages and detect the table of contents:

${pagesContent}

Use the analyzePage tool to examine pages if needed.
Return whether a TOC was found and extract all entries.`;
            log.debug("TOC", "Prompt length", { length: prompt.length });
            const stream = await agent.stream({ prompt });
            log.info("TOC", "Stream started, consuming textStream...");
            // Consume the text stream and collect for debugging
            let rawText = "";
            try {
                for await (const chunk of stream.textStream) {
                    rawText += chunk;
                }
                log.info("TOC", "TextStream consumed", {
                    rawTextLength: rawText.length,
                });
                log.raw("TOC", "Raw LLM response", rawText);
            }
            catch (streamError) {
                log.error("TOC", "Error consuming textStream", {
                    error: streamError instanceof Error
                        ? streamError.message
                        : String(streamError),
                    stack: streamError instanceof Error ? streamError.stack : undefined,
                });
                throw streamError;
            }
            // Now await the parsed output
            log.info("TOC", "Awaiting parsed output...");
            try {
                const result = await stream.output;
                log.info("TOC", "Output parsed successfully", {
                    hasToc: result.hasToc,
                    entriesCount: result.entries.length,
                    tocEndPage: result.tocEndPage,
                });
                if (result.hasToc && result.entries.length > 0) {
                    yield {
                        event: {
                            type: "toc_detected",
                            timestamp: timestamp(),
                            data: {
                                entriesCount: result.entries.length,
                                tocEndPage: result.tocEndPage,
                            },
                        },
                        entries: result.entries,
                        tocEndPage: result.tocEndPage,
                    };
                }
                else {
                    yield {
                        event: {
                            type: "progress",
                            timestamp: timestamp(),
                            data: { step: "toc_detection", message: "No TOC detected" },
                        },
                        entries: undefined,
                        tocEndPage: undefined,
                    };
                }
            }
            catch (parseError) {
                log.error("TOC", "Failed to parse output", {
                    error: parseError instanceof Error
                        ? parseError.message
                        : String(parseError),
                    stack: parseError instanceof Error ? parseError.stack : undefined,
                    rawTextLength: rawText.length,
                });
                throw parseError;
            }
        },
    };
}
//# sourceMappingURL=toc-detector.js.map