/**
 * DeepAgent-based wrappers for vectorless document processing agents.
 * Adds planning + event system on top of existing tool-based agents.
 */
import { DeepAgent } from "@onegenui/deep-agents";
import type { LanguageModel, Tool } from "ai";

export interface DocumentAgentConfig {
  model: LanguageModel;
  instructions: string;
  tools: Record<string, Tool>;
  maxSteps?: number;
  onProgress?: (event: { type: string; data: unknown }) => void;
}

/**
 * Creates a DeepAgent for document processing tasks.
 * Wraps the existing tool-based agents with planning + events.
 */
export function createDocumentAgent(config: DocumentAgentConfig): DeepAgent {
  const builder = DeepAgent.create({
    model: config.model,
    instructions: config.instructions,
    maxSteps: config.maxSteps ?? 20,
  }).withPlanning();

  if (Object.keys(config.tools).length > 0) {
    builder.withTools(config.tools);
  }

  if (config.onProgress) {
    const onProgress = config.onProgress;
    builder.on("step:start", (evt) =>
      onProgress({ type: "step:start", data: evt.data }),
    );
    builder.on("step:end", (evt) =>
      onProgress({ type: "step:end", data: evt.data }),
    );
  }

  return builder.build();
}
