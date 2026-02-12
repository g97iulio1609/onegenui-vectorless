#!/usr/bin/env node
import { Command } from 'commander';
import { McpState } from './state.js';
import { createModel, detectProvider, type ProviderName } from '../cli/provider.js';

const program = new Command()
  .name('vectorless-mcp')
  .description('AI Detective MCP Server')
  .version('3.0.0')
  .option('-t, --transport <type>', 'Transport type (stdio|http)', 'stdio')
  .option('-p, --port <number>', 'HTTP port (for http transport)', '3100')
  .option('--provider <provider>', 'AI provider (gemini|openai|anthropic|openrouter)')
  .option('--model <model>', 'Model ID')
  .option('--api-key <key>', 'API key');

program.action(async (opts: {
  transport: string;
  port: string;
  provider?: string;
  model?: string;
  apiKey?: string;
}) => {
  const state = new McpState();

  // Configure AI model from flags or env
  const providerName = (opts.provider as ProviderName) ?? detectProvider();
  if (providerName) {
    const model = await createModel(providerName, opts.model, opts.apiKey);
    state.setModel(model);
  }

  if (opts.transport === 'http') {
    const { startHttpTransport } = await import('./transports/http.js');
    await startHttpTransport(parseInt(opts.port, 10), state);
    console.error(`Vectorless MCP HTTP server running on port ${opts.port}`);
  } else {
    const { startStdioTransport } = await import('./transports/stdio.js');
    await startStdioTransport(state);
  }
});

program.parse();
