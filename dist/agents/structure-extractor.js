import { ToolLoopAgent, tool, stepCountIs, Output, } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createSessionLogger, } from "../infrastructure/logger.js";
const StructureOutputSchema = z.object({
    title: z.string().describe("Document title"),
    sections: z
        .array(z.object({
        title: z.string().describe("Section title"),
        level: z.number().int().min(1).max(6).describe("Hierarchy level (1-6)"),
        pageStart: z.number().int().min(1).describe("Starting page"),
        pageEnd: z.number().int().min(1).describe("Ending page"),
        children: z
            .array(z.object({
            title: z.string().describe("Subsection title"),
            level: z.number().int().min(1).max(6).describe("Hierarchy level"),
            pageStart: z.number().int().min(1).describe("Starting page"),
            pageEnd: z.number().int().min(1).describe("Ending page"),
        }))
            .optional()
            .describe("Nested subsections"),
    }))
        .describe("Main sections of the document"),
});
function convertToTreeNode(data, totalPages) {
    function convertSection(section) {
        return {
            id: randomUUID(),
            title: section.title,
            level: section.level,
            pageStart: section.pageStart,
            pageEnd: section.pageEnd,
            children: section.children?.map((sub) => ({
                id: randomUUID(),
                title: sub.title,
                level: sub.level,
                pageStart: sub.pageStart,
                pageEnd: sub.pageEnd,
            })),
        };
    }
    return {
        id: randomUUID(),
        title: data.title,
        level: 0,
        pageStart: 1,
        pageEnd: totalPages,
        children: data.sections.map(convertSection),
    };
}
export function createStructureExtractorAgent(model, logger) {
    // Create logger if not provided
    const log = logger || createSessionLogger(`structure-${Date.now()}`);
    return {
        async *extractStructure(pages, tocEntries, tocEndPage) {
            const timestamp = () => new Date().toISOString();
            const contentStartPage = tocEndPage ? tocEndPage + 1 : 1;
            const totalPages = pages.length;
            log.info("STRUCTURE", "Starting structure extraction", {
                totalPages,
                contentStartPage,
                hasToc: !!tocEntries,
                tocEntriesCount: tocEntries?.length ?? 0,
            });
            yield {
                event: {
                    type: "started",
                    timestamp: timestamp(),
                    data: {
                        step: "structure_extraction",
                        totalPages: pages.length,
                    },
                },
            };
            // Build page content map for tool access
            const pageContentMap = new Map();
            for (const page of pages) {
                pageContentMap.set(page.pageNumber, page.content);
            }
            // Build context from TOC entries if available
            let tocContext = "";
            if (tocEntries && tocEntries.length > 0) {
                tocContext = `\n\nDetected Table of Contents:\n${tocEntries.map((e) => `${"  ".repeat(e.level)}• ${e.title} (page ${e.pageNumber})`).join("\n")}`;
            }
            // Sample pages for initial context
            const samplePageNumbers = new Set();
            samplePageNumbers.add(contentStartPage);
            samplePageNumbers.add(Math.min(contentStartPage + 1, totalPages));
            samplePageNumbers.add(Math.floor((contentStartPage + totalPages) / 2));
            samplePageNumbers.add(totalPages);
            if (tocEntries) {
                for (const entry of tocEntries.slice(0, 15)) {
                    samplePageNumbers.add(entry.pageNumber);
                }
            }
            const sampleContent = Array.from(samplePageNumbers)
                .sort((a, b) => a - b)
                .slice(0, 12)
                .map((n) => {
                const page = pages.find((p) => p.pageNumber === n);
                return page
                    ? `--- PAGE ${n} ---\n${page.content.slice(0, 2000)}`
                    : null;
            })
                .filter(Boolean)
                .join("\n\n");
            const jsonExample = `{
  "title": "Document Title",
  "sections": [
    {
      "title": "Chapter 1: Introduction",
      "level": 1,
      "pageStart": 1,
      "pageEnd": 15,
      "children": [
        {"title": "1.1 Background", "level": 2, "pageStart": 1, "pageEnd": 5},
        {"title": "1.2 Objectives", "level": 2, "pageStart": 6, "pageEnd": 15}
      ]
    },
    {
      "title": "Chapter 2: Methods",
      "level": 1,
      "pageStart": 16,
      "pageEnd": 30
    }
  ]
}`;
            const agent = new ToolLoopAgent({
                model: model,
                instructions: `You are an expert at analyzing document structure. Extract the hierarchical structure from this ${totalPages}-page document.
${tocContext}

WORKFLOW:
1. Review the sample pages provided in the prompt
2. Optionally use the readPage tool to examine additional pages if needed
3. Generate the final JSON output matching the expected format

EXPECTED JSON FORMAT:
${jsonExample}

RULES:
- title: The main document title
- sections: Array of main sections/chapters
- level: 1 = main chapters, 2 = subsections, 3 = sub-subsections
- pageStart/pageEnd: Must be between 1 and ${totalPages}, pageEnd >= pageStart
- children: Optional array of subsections

After analyzing, output ONLY the JSON object. Do not include any other text.`,
                output: Output.object({ schema: StructureOutputSchema }),
                tools: {
                    readPage: tool({
                        description: "Read content of a specific page. Call this to examine pages not in the initial sample.",
                        inputSchema: z.object({
                            pageNumber: z
                                .number()
                                .int()
                                .min(1)
                                .max(totalPages)
                                .describe("Page number to read (1 to " + totalPages + ")"),
                        }),
                        execute: async ({ pageNumber }) => {
                            const content = pageContentMap.get(pageNumber);
                            if (!content) {
                                return { error: `Page ${pageNumber} not found` };
                            }
                            log.debug("STRUCTURE", `Tool readPage called for page ${pageNumber}`);
                            return { pageNumber, content: content.slice(0, 4000) };
                        },
                    }),
                },
                stopWhen: stepCountIs(500),
            });
            yield {
                event: {
                    type: "progress",
                    timestamp: timestamp(),
                    data: {
                        step: "structure_extraction",
                        progress: 1,
                        message: "Analyzing document structure...",
                    },
                },
            };
            // Use generate() with ToolLoopAgent for reliable structured output
            log.info("STRUCTURE", "Starting agent.generate()");
            const prompt = `Analyze this document and extract its structure.

Sample pages for analysis:
${sampleContent}

Use the readPage tool if you need to examine additional pages.
Return the complete document structure with title, sections, and page ranges.`;
            log.debug("STRUCTURE", "Prompt length", { length: prompt.length });
            try {
                const { output: result, text, steps, } = await agent.generate({ prompt });
                log.info("STRUCTURE", "Generate completed", {
                    stepsCount: steps.length,
                    textLength: text.length,
                    hasOutput: !!result,
                });
                log.raw("STRUCTURE", "Raw text from generate", text);
                if (!result) {
                    log.error("STRUCTURE", "No structured output generated", {
                        stepsCount: steps.length,
                        textLength: text.length,
                    });
                    throw new Error("No structured output generated from agent");
                }
                log.info("STRUCTURE", "Output parsed successfully", {
                    title: result.title,
                    sectionsCount: result.sections.length,
                });
                const tree = convertToTreeNode(result, totalPages);
                yield {
                    event: {
                        type: "node_created",
                        timestamp: timestamp(),
                        data: {
                            title: tree.title,
                            childrenCount: tree.children?.length ?? 0,
                        },
                    },
                    node: tree,
                };
            }
            catch (error) {
                log.error("STRUCTURE", "Agent generate failed", {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
                throw error;
            }
        },
    };
}
//# sourceMappingURL=structure-extractor.js.map