import { type LanguageModel, generateText, Output } from "ai";
import { z } from "zod";

const VerifyTitleSchema = z.object({
  thinking: z.string().describe("Reasoning about whether the title appears"),
  appears: z
    .enum(["yes", "no"])
    .describe("Whether the section title appears or starts on this page"),
  confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
});

const VerifyTitleStartSchema = z.object({
  thinking: z.string(),
  startBegin: z
    .enum(["yes", "no"])
    .describe("Whether the section starts at the beginning of the page"),
});

/**
 * Verify that a section title appears on the indicated page.
 */
export async function verifyTitleOnPage(
  model: LanguageModel,
  title: string,
  pageContent: string,
): Promise<{ appears: boolean; confidence: number }> {
  const jsonExample = `{
  "thinking": "The title 'Introduction' appears on line 3 of the page content...",
  "appears": "yes",
  "confidence": 0.95
}`;

  const { output } = await generateText({
    model: model as any,
    output: Output.object({ schema: VerifyTitleSchema }),
    prompt: `Check if the given section title appears in the page text.
Do fuzzy matching, ignore space inconsistencies.

Section title: ${title}
Page text: ${pageContent.slice(0, 3000)}

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object.`,
  });

  if (!output) {
    return { appears: false, confidence: 0 };
  }

  return {
    appears: output.appears === "yes",
    confidence: output.confidence,
  };
}

/**
 * Check if a section starts at the beginning of a page.
 */
export async function verifyTitleAtPageStart(
  model: LanguageModel,
  title: string,
  pageContent: string,
): Promise<boolean> {
  const jsonExample = `{
  "thinking": "The section title appears as the first content on the page...",
  "startBegin": "yes"
}`;

  const { output } = await generateText({
    model: model as any,
    output: Output.object({ schema: VerifyTitleStartSchema }),
    prompt: `Check if the section starts at the BEGINNING of the page.
If there are other contents before the section title, answer "no".
If the section title is the first content on the page, answer "yes".
Do fuzzy matching, ignore space inconsistencies.

Section title: ${title}
Page text: ${pageContent.slice(0, 2000)}

EXPECTED JSON FORMAT:
${jsonExample}

Return ONLY the JSON object.`,
  });

  if (!output) {
    return false;
  }

  return output.startBegin === "yes";
}
