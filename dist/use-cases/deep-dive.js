import { DeepDiveAgent } from "../agents/deep-dive.js";
export class DeepDiveUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(request) {
        const { nodeId, knowledgeBaseId, options = {} } = request;
        // Load knowledge base
        const kb = await this.deps.kbRepository.findById(knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${knowledgeBaseId} not found`);
        }
        // Check cache
        const cacheKey = `deepdive:${knowledgeBaseId}:${nodeId}`;
        const cached = await this.deps.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Get pages for the document
        const pages = await this.deps.getPages(knowledgeBaseId);
        // Create deep dive agent
        const agent = new DeepDiveAgent(this.deps.model);
        let result = null;
        for await (const { node } of agent.deepDive(nodeId, kb, pages)) {
            if (node) {
                result = { node };
            }
        }
        if (!result) {
            throw new Error(`Failed to deep dive into node ${nodeId}`);
        }
        // Cache result
        await this.deps.cache.set(cacheKey, result, 86400000); // 24 hours
        return result;
    }
}
//# sourceMappingURL=deep-dive.js.map