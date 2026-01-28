/**
 * Batch TOC Verifier
 *
 * Verifies multiple TOC entries in a single LLM call for efficiency.
 * Reduces N verification calls to 1 call.
 */
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

// Schema for batch verification output
const BatchVerifySchema = z.object({
  verifications: z.array(
    z.object({
      index: z.number().describe("Index of the verification request"),
      appears: z.boolean().describe("Whether the title appears on the page"),
      confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
      reasoning: z.string().optional().describe("Brief reasoning"),
    }),
  ),
});

export interface VerifyRequest {
  title: string;
  pageContent: string;
  pageNumber: number;
}

export interface BatchVerifyResult {
  appears: boolean;
  confidence: number;
  pageNumber: number;
  title: string;
}

/**
 * Verify multiple TOC entries in a single LLM call.
 * Much more efficient than individual calls.
 */
export async function batchVerifyTitlesOnPages(
  model: LanguageModel,
  requests: VerifyRequest[],
): Promise<BatchVerifyResult[]> {
  if (requests.length === 0) return [];

  // Build structured input
  const verificationsInput = requests.map((req, i) => ({
    index: i,
    title: req.title,
    pageNumber: req.pageNumber,
    // Truncate content to fit context
    pageContent: req.pageContent.slice(0, 1500),
  }));

  const prompt = `Verify whether each section title appears on its indicated page.
Do fuzzy matching, ignore minor space/formatting differences.

SECTIONS TO VERIFY:
${verificationsInput
  .map(
    (v) => `
[${v.index}] Title: "${v.title}"
Page ${v.pageNumber} content:
${v.pageContent}
---`,
  )
  .join("\n")}

For each section, determine if the title appears on the page content.
Return a verification for EACH index (0 to ${requests.length - 1}).`;

  try {
    const result = await generateObject({
      model: model as Parameters<typeof generateObject>[0]["model"],
      schema: BatchVerifySchema,
      prompt,
    });

    // Map results back to requests
    const resultMap = new Map<
      number,
      (typeof result.object.verifications)[0]
    >();
    for (const v of result.object.verifications) {
      resultMap.set(v.index, v);
    }

    return requests.map((req, i) => {
      const verification = resultMap.get(i);
      return {
        title: req.title,
        pageNumber: req.pageNumber,
        appears: verification?.appears ?? false,
        confidence: verification?.confidence ?? 0,
      };
    });
  } catch (error) {
    console.error("[batch-verify] Verification failed:", error);
    // Fallback: return all as unverified
    return requests.map((req) => ({
      title: req.title,
      pageNumber: req.pageNumber,
      appears: false,
      confidence: 0,
    }));
  }
}

/**
 * Batch verify if titles start at the beginning of pages.
 */
export async function batchVerifyTitlesAtStart(
  model: LanguageModel,
  requests: VerifyRequest[],
): Promise<Map<number, boolean>> {
  if (requests.length === 0) return new Map();

  const StartVerifySchema = z.object({
    results: z.array(
      z.object({
        index: z.number(),
        startsAtBeginning: z.boolean(),
      }),
    ),
  });

  const verificationsInput = requests.map((req, i) => ({
    index: i,
    title: req.title,
    pageStart: req.pageContent.slice(0, 500), // Only first 500 chars
  }));

  const prompt = `For each section, check if the title appears at the BEGINNING of the page.
Answer true if the title is the first content, false if other content comes before it.

SECTIONS:
${verificationsInput
  .map(
    (v) => `
[${v.index}] Title: "${v.title}"
Page start: ${v.pageStart}`,
  )
  .join("\n---\n")}

Return startsAtBeginning for each index.`;

  try {
    const result = await generateObject({
      model: model as Parameters<typeof generateObject>[0]["model"],
      schema: StartVerifySchema,
      prompt,
    });

    const resultMap = new Map<number, boolean>();
    for (const r of result.object.results) {
      resultMap.set(
        requests[r.index]?.pageNumber ?? r.index,
        r.startsAtBeginning,
      );
    }
    return resultMap;
  } catch (error) {
    console.error("[batch-verify] Start verification failed:", error);
    return new Map();
  }
}
