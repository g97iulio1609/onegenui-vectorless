/**
 * Agentic Retrieval Agent
 *
 * Implements the PageIndex agentic retrieval pattern:
 * 1. Agent sees document structure (tree)
 * 2. Agent decides which sections/pages to read
 * 3. Agent reads content on demand
 * 4. Agent generates answer with citations
 *
 * Uses ToolLoopAgent with tools:
 * - get_structure: View document tree structure
 * - read_section: Read content from a specific section (node)
 * - read_pages: Read content from specific pages (if pages provided)
 */
import { ToolLoopAgent, tool, stepCountIs, Output, } from "ai";
import { z } from "zod";
// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────
const AgenticRetrievalOutputSchema = z.object({
    thinking: z.string().describe("Step-by-step reasoning about what was found"),
    answer: z
        .string()
        .describe("The final comprehensive answer with INLINE citation markers. Use [1], [2], [3] etc. to mark where each citation supports the text. Example: 'Il principio di precauzione [1] è fondamentale nel diritto ambientale [2].' Be detailed and thorough."),
    citations: z
        .array(z.object({
        id: z
            .number()
            .int()
            .describe("Citation number matching the [N] marker in the answer"),
        pageNumber: z.number().int().describe("Page number of the citation"),
        excerpt: z
            .string()
            .describe("The EXACT text quoted from the document. Must be a direct verbatim quote from the source, at least 50 characters."),
        nodeTitle: z.string().optional().describe("Section title if known"),
    }))
        .describe("Citations array. Each citation has an id (1, 2, 3...) matching the [N] markers in the answer text."),
});
// ─────────────────────────────────────────────────────────────────────────────
// Tree Utilities
// ─────────────────────────────────────────────────────────────────────────────
function formatTreeForAgent(tree) {
    const lines = [];
    function traverse(node, depth) {
        const indent = "  ".repeat(depth);
        const pageInfo = `(pages ${node.pageStart ?? "?"}-${node.pageEnd ?? "?"})`;
        const hasText = node.text ? " [has content]" : "";
        const summary = node.summary
            ? `\n${indent}  Summary: ${node.summary.slice(0, 200)}...`
            : "";
        lines.push(`${indent}[${node.id}] ${node.title} ${pageInfo}${hasText}${summary}`);
        for (const child of node.children ?? []) {
            traverse(child, depth + 1);
        }
    }
    traverse(tree, 0);
    return lines.join("\n");
}
function buildNodeMap(tree) {
    const map = new Map();
    function traverse(node) {
        if (node.id) {
            map.set(node.id, node);
        }
        for (const child of node.children ?? []) {
            traverse(child);
        }
    }
    traverse(tree);
    return map;
}
// ─────────────────────────────────────────────────────────────────────────────
// Agentic Retrieval Agent
// ─────────────────────────────────────────────────────────────────────────────
export async function* agenticRetrieval(model, query, tree, pages, options = {}) {
    const { maxSections = 5, maxPages = 10, maxSteps = 20, expertPreferences, } = options;
    const timestamp = () => new Date().toISOString();
    yield {
        event: {
            type: "started",
            timestamp: timestamp(),
            data: { step: "agentic_retrieval", query: query.slice(0, 100) },
        },
    };
    // Track what has been read
    const sectionsRead = [];
    const pagesRead = [];
    // Build node map for quick lookup
    const nodeMap = buildNodeMap(tree);
    // Build the agent prompt
    const expertContext = expertPreferences
        ? `\n\nExpert Knowledge to consider:\n${expertPreferences}\n`
        : "";
    const jsonExample = `{
  "thinking": "Step-by-step reasoning about what I found...",
  "answer": "The detailed answer based on the document content...",
  "citations": [
    {"pageNumber": 5, "excerpt": "Relevant quote from page 5", "nodeTitle": "Section Title"},
    {"pageNumber": 12, "excerpt": "Another relevant quote", "nodeTitle": "Another Section"}
  ]
}`;
    const hasPages = pages && pages.length > 0;
    const toolsDescription = hasPages
        ? "get_structure, read_section, read_pages"
        : "get_structure, read_section";
    const instructions = `You are an expert document analyst. Your task is to find information and provide a well-cited answer.

AVAILABLE TOOLS: ${toolsDescription}

WORKFLOW:
1. First, call get_structure() to see the document's table of contents
2. Identify which sections are relevant to the query
3. Call read_section(node_id) to read content of relevant sections
4. You may read multiple sections if needed (max ${maxSections})
5. When you have enough information, generate the final answer

IMPORTANT:
- Always start by viewing the structure
- Read sections selectively, focusing on the most relevant ones
- Include specific citations with page numbers and excerpts
- If the information is not in the document, say so clearly
${expertContext}

EXPECTED JSON FORMAT:
${jsonExample}

After gathering information, output ONLY the JSON object.`;
    // Build base tools
    const getStructureTool = tool({
        description: "View the document's hierarchical structure (table of contents with summaries). " +
            "Call this first to understand the document layout and decide which sections to read.",
        inputSchema: z.object({}),
        execute: async () => {
            const structure = formatTreeForAgent(tree);
            return {
                documentTitle: tree.title,
                totalPages: tree.pageEnd ?? pages?.length ?? 0,
                sectionsCount: nodeMap.size,
                structure,
            };
        },
    });
    const readSectionTool = tool({
        description: "Read the full content of a specific section by its node_id. " +
            "Use this after viewing the structure to get detailed content from a relevant section.",
        inputSchema: z.object({
            nodeId: z
                .string()
                .describe("The node_id of the section to read (from get_structure output)"),
        }),
        execute: async ({ nodeId }) => {
            const node = nodeMap.get(nodeId);
            if (!node) {
                return { error: `Section with id '${nodeId}' not found` };
            }
            sectionsRead.push(nodeId);
            // Get content from node.text if available, or node.summary
            let content = node.text || node.summary || "";
            // If no text in node and pages are available, get from pages
            if (!content && pages) {
                const start = node.pageStart ?? 1;
                const end = node.pageEnd ?? start;
                const pageContents = [];
                for (let i = start; i <= end; i++) {
                    const page = pages.find((p) => p.pageNumber === i);
                    if (page) {
                        pageContents.push(page.content);
                        pagesRead.push(i);
                    }
                }
                content = pageContents.join("\n\n");
            }
            if (!content) {
                return {
                    nodeId,
                    title: node.title,
                    pages: `${node.pageStart}-${node.pageEnd}`,
                    content: "[No content available for this section]",
                };
            }
            return {
                nodeId,
                title: node.title,
                pages: `${node.pageStart}-${node.pageEnd}`,
                content: content.slice(0, 8000),
                summary: node.summary,
            };
        },
    });
    // Build the tools object based on whether pages are provided
    const tools = hasPages
        ? {
            get_structure: getStructureTool,
            read_section: readSectionTool,
            read_pages: tool({
                description: "Read content from specific page numbers. " +
                    "Use this if you need content from specific pages not covered by a section.",
                inputSchema: z.object({
                    pageSpec: z
                        .string()
                        .describe("Page numbers to read. Format: '5' for single page, '5-8' for range, '5,7,10' for specific pages"),
                }),
                execute: async ({ pageSpec }) => {
                    const pageNumbers = [];
                    for (const part of pageSpec.split(",")) {
                        const trimmed = part.trim();
                        if (trimmed.includes("-")) {
                            const [startStr, endStr] = trimmed.split("-");
                            const start = parseInt(startStr ?? "0", 10);
                            const end = parseInt(endStr ?? "0", 10);
                            for (let i = start; i <= Math.min(end, start + 10); i++) {
                                pageNumbers.push(i);
                            }
                        }
                        else {
                            pageNumbers.push(parseInt(trimmed, 10));
                        }
                    }
                    const limitedPages = pageNumbers.slice(0, maxPages);
                    pagesRead.push(...limitedPages);
                    const contents = [];
                    for (const pageNum of limitedPages) {
                        const page = pages.find((p) => p.pageNumber === pageNum);
                        if (page) {
                            contents.push({
                                pageNumber: pageNum,
                                content: page.content.slice(0, 4000),
                            });
                        }
                    }
                    if (contents.length === 0) {
                        return { error: "No pages found with those numbers" };
                    }
                    return {
                        pagesRead: contents.map((c) => c.pageNumber),
                        content: contents
                            .map((c) => `<page_${c.pageNumber}>\n${c.content}\n</page_${c.pageNumber}>`)
                            .join("\n\n"),
                    };
                },
            }),
        }
        : {
            get_structure: getStructureTool,
            read_section: readSectionTool,
        };
    // Create the agent
    const agent = new ToolLoopAgent({
        model: model,
        instructions,
        output: Output.object({ schema: AgenticRetrievalOutputSchema }),
        tools: tools, // Cast to any to avoid complex union type issues
        stopWhen: stepCountIs(maxSteps),
    });
    yield {
        event: {
            type: "progress",
            timestamp: timestamp(),
            data: { step: "agentic_retrieval", status: "agent_started" },
        },
    };
    try {
        const { output, steps } = await agent.generate({
            prompt: `Query: ${query}`,
        });
        yield {
            event: {
                type: "progress",
                timestamp: timestamp(),
                data: {
                    step: "agentic_retrieval",
                    status: "agent_completed",
                    stepsCount: steps.length,
                    sectionsRead: [...new Set(sectionsRead)],
                    pagesRead: [...new Set(pagesRead)],
                },
            },
        };
        // Build result from parsed output
        const result = {
            answer: output?.answer ?? "",
            citations: output?.citations ?? [],
            thinking: output?.thinking ?? "",
            sectionsRead: [...new Set(sectionsRead)],
            pagesRead: [...new Set(pagesRead)],
        };
        yield {
            event: {
                type: "completed",
                timestamp: timestamp(),
                data: {
                    step: "agentic_retrieval",
                    citationsCount: result.citations.length,
                    sectionsRead: result.sectionsRead,
                    pagesRead: result.pagesRead,
                },
            },
            result,
        };
    }
    catch (error) {
        yield {
            event: {
                type: "error",
                timestamp: timestamp(),
                data: {
                    step: "agentic_retrieval",
                    error: error instanceof Error ? error.message : String(error),
                },
            },
        };
        throw error;
    }
}
//# sourceMappingURL=agentic-retrieval.js.map