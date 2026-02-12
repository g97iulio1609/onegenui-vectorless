import type { LanguageModel } from 'ai';

export type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: 'gemini-2.5-flash-preview-05-20',
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-4-20250514',
  openrouter: 'google/gemini-2.5-flash-preview',
};

const ENV_KEYS: Record<ProviderName, string> = {
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

/** Resolve API key from CLI flag or env var */
function resolveApiKey(provider: ProviderName, cliKey?: string): string {
  const key = cliKey ?? process.env[ENV_KEYS[provider]];
  if (!key) {
    throw new Error(
      `API key missing. Set ${ENV_KEYS[provider]} env var or use --api-key flag.`,
    );
  }
  return key;
}

/** Create a LanguageModel from provider + model + API key */
export async function createModel(
  provider: ProviderName,
  modelId?: string,
  apiKey?: string,
): Promise<LanguageModel> {
  const key = resolveApiKey(provider, apiKey);
  const model = modelId ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case 'gemini': {
      // @ts-expect-error — dynamic import, installed as peer dep
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      return createGoogleGenerativeAI({ apiKey: key })(model);
    }
    case 'openai': {
      // @ts-expect-error — dynamic import, installed as peer dep
      const { createOpenAI } = await import('@ai-sdk/openai');
      return createOpenAI({ apiKey: key })(model);
    }
    case 'anthropic': {
      // @ts-expect-error — dynamic import, installed as peer dep
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      return createAnthropic({ apiKey: key })(model);
    }
    case 'openrouter': {
      // @ts-expect-error — dynamic import, installed as peer dep
      const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
      return createOpenRouter({ apiKey: key })(model);
    }
  }
}

/** Auto-detect provider from available env vars */
export function detectProvider(): ProviderName | null {
  for (const [name, envKey] of Object.entries(ENV_KEYS)) {
    if (process.env[envKey]) return name as ProviderName;
  }
  return null;
}
