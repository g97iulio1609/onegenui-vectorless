import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { verifyTreeStructure, fixIncorrectNodes, processLargeNodesInTree, addNodeText, removeNodeText, validateNodePageRanges, addPrefaceIfNeeded, } from "../agents/index.js";
export class GenerateIndexUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(request) {
        const { pdfParser, tocDetector, structureExtractor, summarizer, cache, sseEmitter, model, } = this.deps;
        const startTime = Date.now();
        const options = request.options ?? {};
        const contentHash = this.hashContent(request.pdfBuffer);
        // Always parse PDF to get pages (needed for agentic retrieval)
        const pages = await pdfParser.extractPages(request.pdfBuffer);
        const cached = await cache.get(`index:${contentHash}`);
        if (cached) {
            this.emitEvent(sseEmitter, "completed", {
                cached: true,
                documentId: cached.documentId,
            });
            return { index: cached, pages, cached: true };
        }
        this.emitEvent(sseEmitter, "started", { contentHash });
        // PDF already parsed above
        this.emitEvent(sseEmitter, "progress", {
            step: "pdf_parsed",
            totalPages: pages.length,
        });
        // 2. Detect TOC
        let tocEntries;
        let tocEndPage;
        for await (const result of tocDetector.detectToc(pages.slice(0, options.maxTocCheckPages ?? 20))) {
            sseEmitter.emit(result.event);
            if (result.entries)
                tocEntries = result.entries;
            if (result.tocEndPage)
                tocEndPage = result.tocEndPage;
        }
        // 3. Extract structure
        let tree;
        for await (const result of structureExtractor.extractStructure(pages, tocEntries ?? null, tocEndPage ?? null)) {
            sseEmitter.emit(result.event);
            if (result.node)
                tree = result.node;
        }
        if (!tree) {
            throw new Error("Failed to extract document structure");
        }
        // 4. Validate page ranges (from original PageIndex)
        const validation = validateNodePageRanges(tree, pages.length);
        if (validation.truncated > 0) {
            this.emitEvent(sseEmitter, "progress", {
                step: "validate_page_ranges",
                truncated: validation.truncated,
                invalidNodes: validation.invalidNodes,
            });
        }
        // 5. Add preface if needed (from original PageIndex)
        const prefaceAdded = addPrefaceIfNeeded(tree);
        if (prefaceAdded) {
            this.emitEvent(sseEmitter, "progress", {
                step: "preface_added",
            });
        }
        // 6. Verify TOC accuracy (from original PageIndex)
        // Default: enabled. Uses sampling for efficiency (10 nodes max)
        if (options.verifyToc !== false) {
            let incorrectNodes = [];
            for await (const result of verifyTreeStructure(model, tree, pages, {
                sampleSize: 10, // Verify sample of 10 nodes for efficiency
                checkPageStart: true,
            })) {
                sseEmitter.emit(result.event);
                if (result.summary) {
                    incorrectNodes = result.summary.incorrectNodes;
                    this.emitEvent(sseEmitter, "progress", {
                        step: "toc_verification_complete",
                        accuracy: result.summary.accuracy,
                        verified: result.summary.verified,
                        failed: result.summary.failed,
                    });
                }
            }
            // 7. Fix incorrect TOC entries if needed (from original PageIndex)
            if (options.fixIncorrectToc !== false && incorrectNodes.length > 0) {
                for await (const result of fixIncorrectNodes(model, tree, incorrectNodes, pages, { maxRetries: 3, verifyAfterFix: true })) {
                    sseEmitter.emit(result.event);
                }
            }
        }
        // 8. Process large nodes recursively (from original PageIndex)
        if (options.processLargeNodes !== false) {
            for await (const result of processLargeNodesInTree(tree, pages, {
                model,
                maxPagesPerNode: options.maxPagesPerNode ?? 15,
                maxTokensPerNode: options.maxTokensPerNode ?? 20000,
            })) {
                sseEmitter.emit(result.event);
            }
        }
        // 9. Add node text if needed for summaries
        // Text is needed if summaries or explicit node text requested
        const needsText = options.addSummaries !== false || options.addNodeText === true;
        if (needsText) {
            addNodeText(tree, pages);
        }
        // 10. Generate summaries (default: enabled, uses BatchSummarizer for efficiency)
        if (options.addSummaries !== false) {
            const summaries = new Map();
            for await (const result of summarizer.generateSummaries(tree, pages)) {
                sseEmitter.emit(result.event);
                if (result.nodeId && result.summary) {
                    summaries.set(result.nodeId, result.summary);
                }
            }
            this.applySummaries(tree, summaries);
        }
        // 11. Remove text if we only needed it for summaries
        if (options.addSummaries !== false && !options.addNodeText) {
            removeNodeText(tree);
        }
        // 12. Generate document description
        let description;
        if (options.addDescription !== false) {
            description = await summarizer.generateDocumentDescription(tree);
        }
        const documentIndex = {
            documentId: randomUUID(),
            title: tree.title,
            description,
            totalPages: pages.length,
            hasToc: !!tocEntries,
            tocEndPage,
            tree,
            metadata: {
                processedAt: new Date().toISOString(),
                modelUsed: options.model ?? "gemini-3-flash-preview",
                processingTimeMs: Date.now() - startTime,
            },
        };
        await cache.set(`index:${contentHash}`, documentIndex);
        this.emitEvent(sseEmitter, "completed", {
            documentId: documentIndex.documentId,
        });
        sseEmitter.close();
        return { index: documentIndex, pages, cached: false };
    }
    hashContent(buffer) {
        return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
    }
    emitEvent(emitter, type, data) {
        emitter.emit({
            type,
            timestamp: new Date().toISOString(),
            data,
        });
    }
    applySummaries(node, summaries) {
        const nodeId = node.id;
        if (nodeId && summaries.has(nodeId)) {
            node.summary = summaries.get(nodeId);
        }
        if (node.children) {
            for (const child of node.children) {
                this.applySummaries(child, summaries);
            }
        }
    }
}
//# sourceMappingURL=generate-index.js.map