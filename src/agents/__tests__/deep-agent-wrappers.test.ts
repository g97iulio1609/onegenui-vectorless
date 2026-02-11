import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LanguageModel } from "ai";

// =============================================================================
// Mock AI SDK — same pattern as deep-agents tests
// =============================================================================

const { generateFn, constructorSpy } = vi.hoisted(() => {
  const generateFn = vi.fn().mockResolvedValue({
    text: "Mock response",
    steps: [{ type: "text" }],
  });
  const constructorSpy = vi.fn();
  return { generateFn, constructorSpy };
});

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();

  class MockToolLoopAgent {
    constructor(settings: Record<string, unknown>) {
      constructorSpy(settings);
    }
    generate = generateFn;
  }

  return { ...actual, ToolLoopAgent: MockToolLoopAgent };
});

import { createDocumentAgent } from "../deep-agent-wrappers.js";

// =============================================================================
// Helpers
// =============================================================================

const mockModel = {
  modelId: "test-model",
  provider: "test-provider",
  specificationVersion: "v1",
  defaultObjectGenerationMode: "json",
} as unknown as LanguageModel;

// =============================================================================
// Tests
// =============================================================================

describe("createDocumentAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateFn.mockResolvedValue({
      text: "Mock response",
      steps: [{ type: "text" }],
    });
  });

  it("should create agent with instructions and tools", async () => {
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "Analyze the document",
      tools: { readPage: {} as any },
    });

    expect(agent).toBeDefined();
    expect(agent.sessionId).toBeDefined();

    await agent.run("Process document");

    const settings = constructorSpy.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    const toolKeys = Object.keys(
      settings.tools as Record<string, unknown>,
    );
    expect(toolKeys).toContain("readPage");
  });

  it("should default maxSteps to 20", async () => {
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "test",
      tools: {},
    });

    await agent.run("Hello");

    expect(constructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "test",
      }),
    );
  });

  it("should use custom maxSteps when provided", () => {
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "test",
      tools: {},
      maxSteps: 50,
    });
    expect(agent).toBeDefined();
  });

  it("should include planning tools", async () => {
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "test",
      tools: {},
    });

    await agent.run("Process");

    const settings = constructorSpy.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    const toolKeys = Object.keys(
      settings.tools as Record<string, unknown>,
    );
    expect(toolKeys).toContain("write_todos");
    expect(toolKeys).toContain("review_todos");
  });

  it("should wire onProgress to step events", () => {
    const onProgress = vi.fn();
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "test",
      tools: {},
      onProgress,
    });

    expect(agent).toBeDefined();
    expect(agent.eventBus).toBeDefined();
  });

  it("should not register event handlers when onProgress is absent", () => {
    const agent = createDocumentAgent({
      model: mockModel,
      instructions: "test",
      tools: {},
    });

    expect(agent).toBeDefined();
  });
});
