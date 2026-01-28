/**
 * Batch Summarizer Agent
 *
 * Optimized summarizer that generates summaries for ALL nodes in a single LLM call,
 * reducing N calls to 1 call. For very large documents, chunks nodes into batches.
 *
 * Performance improvement: 90% reduction in LLM calls for summarization.
 */
import { generateObject } from "ai";
import { z } from "zod";
// Schema for batch summary output
const BatchSummarySchema = z.object({
    summaries: z.array(z.object({
        nodeId: z.string().describe("The unique ID of the node"),
        summary: z
            .string()
            .describe("Comprehensive summary of the section content. Include key concepts, main arguments, and important details. Should be thorough but not verbose."),
    })),
    documentDescription: z
        .string()
        .optional()
        .describe("Optional overall document description"),
});
// Schema for document description only
const DescriptionOnlySchema = z.object({
    description: z.string().describe("Comprehensive document description"),
});
// Maximum nodes per batch to avoid context length issues
const MAX_NODES_PER_BATCH = 30;
// Minimum content length to warrant a summary
const MIN_CONTENT_LENGTH = 100;
export function createBatchSummarizerAgent(model) {
    /**
     * Recursively collect all nodes with their content
     */
    function collectNodesWithContent(tree, pages) {
        const nodes = [];
        function traverse(node, index) {
            const nodeId = node.id ?? `node-${index}`;
            const content = getContentForNode(node, pages);
            if (content.length >= MIN_CONTENT_LENGTH) {
                nodes.push({
                    id: nodeId,
                    title: node.title,
                    content, // Full content - let the model handle it
                    pageStart: node.pageStart ?? 1,
                    pageEnd: node.pageEnd ?? 1,
                });
            }
            if (node.children) {
                node.children.forEach((child, i) => traverse(child, nodes.length + i));
            }
        }
        traverse(tree, 0);
        return nodes;
    }
    function getContentForNode(node, pages) {
        if (node.content)
            return node.content;
        if (!node.pageStart || !node.pageEnd)
            return "";
        return pages
            .filter((p) => p.pageNumber >= node.pageStart && p.pageNumber <= node.pageEnd)
            .map((p) => p.content)
            .join("\n");
    }
    /**
     * Generate summaries for a batch of nodes in a single LLM call
     */
    async function generateBatchSummaries(nodes, includeDocDescription = false) {
        const summaries = new Map();
        if (nodes.length === 0)
            return summaries;
        // Build structured input for the LLM
        const nodesInput = nodes.map((n, i) => ({
            index: i + 1,
            nodeId: n.id,
            title: n.title,
            pages: `${n.pageStart}-${n.pageEnd}`,
            content: n.content,
        }));
        const prompt = `Generate comprehensive summaries for the following ${nodes.length} document sections.
Each summary should capture the key concepts, main arguments, and important details of that section.
Be thorough but avoid unnecessary verbosity.

SECTIONS TO SUMMARIZE:
${nodesInput
            .map((n) => `
[Section ${n.index}] ID: ${n.nodeId}
Title: ${n.title}
Pages: ${n.pages}
Content:
${n.content}
---`)
            .join("\n")}

${includeDocDescription ? "\nAlso provide an overall document description based on these sections." : ""}

Return a summary for EACH section using the exact nodeId provided.`;
        try {
            const result = await generateObject({
                model: model,
                schema: BatchSummarySchema,
                prompt,
            });
            // Map results back to node IDs
            for (const item of result.object.summaries) {
                summaries.set(item.nodeId, item.summary);
            }
            if (includeDocDescription && result.object.documentDescription) {
                summaries.set("__document__", result.object.documentDescription);
            }
        }
        catch (error) {
            console.error("[batch-summarizer] Batch generation failed:", error);
            // Graceful degradation: return empty summaries rather than failing
        }
        return summaries;
    }
    return {
        async *generateSummaries(tree, pages) {
            const timestamp = () => new Date().toISOString();
            const allNodes = collectNodesWithContent(tree, pages);
            yield {
                event: {
                    type: "started",
                    timestamp: timestamp(),
                    data: {
                        step: "batch_summarization",
                        totalNodes: allNodes.length,
                        batches: Math.ceil(allNodes.length / MAX_NODES_PER_BATCH),
                    },
                },
            };
            // Process in batches if document is very large
            const batches = [];
            for (let i = 0; i < allNodes.length; i += MAX_NODES_PER_BATCH) {
                batches.push(allNodes.slice(i, i + MAX_NODES_PER_BATCH));
            }
            let processedTotal = 0;
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const isLastBatch = batchIndex === batches.length - 1;
                const currentBatch = batch; // batch is guaranteed to exist in for loop
                yield {
                    event: {
                        type: "progress",
                        timestamp: timestamp(),
                        data: {
                            step: "batch_summarization",
                            batch: batchIndex + 1,
                            totalBatches: batches.length,
                            nodesInBatch: currentBatch.length,
                        },
                    },
                };
                // Generate all summaries for this batch in ONE LLM call
                const batchSummaries = await generateBatchSummaries(currentBatch, isLastBatch);
                // Yield individual results for compatibility
                for (const node of currentBatch) {
                    const summary = batchSummaries.get(node.id);
                    if (summary) {
                        yield {
                            event: {
                                type: "summary_generated",
                                timestamp: timestamp(),
                                data: {
                                    nodeId: node.id,
                                    title: node.title,
                                    progress: processedTotal + 1,
                                    total: allNodes.length,
                                },
                            },
                            nodeId: node.id,
                            summary,
                        };
                    }
                    processedTotal++;
                }
            }
            yield {
                event: {
                    type: "completed",
                    timestamp: timestamp(),
                    data: {
                        step: "batch_summarization",
                        totalProcessed: processedTotal,
                        llmCalls: batches.length, // Only N batches instead of N nodes!
                    },
                },
            };
        },
        async generateDocumentDescription(tree) {
            const structureOverview = JSON.stringify({
                title: tree.title,
                sections: tree.children?.map((c) => ({
                    title: c.title,
                    subsections: c.children?.slice(0, 5).map((gc) => gc.title),
                    hasMore: (c.children?.length ?? 0) > 5,
                })),
            }, null, 2);
            try {
                const result = await generateObject({
                    model: model,
                    schema: DescriptionOnlySchema,
                    prompt: `Based on this document structure, generate a comprehensive description.
Include: document type, main topics, target audience, and key takeaways.

Document Structure:
${structureOverview}`,
                });
                return result.object.description;
            }
            catch (error) {
                console.error("[batch-summarizer] Description generation failed:", error);
                return `Document: ${tree.title}`;
            }
        },
    };
}
//# sourceMappingURL=batch-summarizer.js.map