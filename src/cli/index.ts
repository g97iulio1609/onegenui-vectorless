#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { createModel, detectProvider, type ProviderName } from './provider.js';
import { state } from './state.js';
import { indexCommand } from './commands/index-cmd.js';
import { searchCommand } from './commands/search-cmd.js';
import { askCommand } from './commands/ask-cmd.js';
import { statsCommand, listCommand } from './commands/stats-cmd.js';
import { replCommand } from './commands/repl-cmd.js';

const program = new Command();

program
  .name('vectorless')
  .description('AI Detective CLI — Index documents and investigate with AI')
  .version('3.0.0')
  .option('-p, --provider <provider>', 'AI provider (gemini|openai|anthropic|openrouter)')
  .option('-m, --model <model>', 'Model ID (overrides provider default)')
  .option('-k, --api-key <key>', 'API key (overrides env var)');

/** Initialize the AI model from CLI options */
async function initModel(opts: { provider?: string; model?: string; apiKey?: string }): Promise<void> {
  const providerName = (opts.provider as ProviderName) ?? detectProvider();
  if (!providerName) {
    console.log(chalk.red(
      'No AI provider configured. Use --provider flag or set an API key env var:\n' +
      '  GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY',
    ));
    process.exit(1);
  }

  const model = await createModel(providerName, opts.model, opts.apiKey);
  state.setModel(model);
  console.log(chalk.dim(`Provider: ${providerName} | Model: ${opts.model ?? 'default'}`));
}

program
  .command('index <files...>')
  .description('Index documents (PDF, TXT, MD, DOCX, XLSX, PPTX, HTML)')
  .action(async (files: string[]) => {
    await initModel(program.opts());
    await indexCommand(files);
  });

program
  .command('search <query...>')
  .description('BM25 full-text search across indexed documents')
  .action((queryParts: string[]) => {
    searchCommand(queryParts.join(' '));
  });

program
  .command('ask <question...>')
  .description('Ask the AI Detective a question')
  .action(async (questionParts: string[]) => {
    await initModel(program.opts());
    await askCommand(questionParts.join(' '));
  });

program
  .command('stats')
  .description('Show index statistics')
  .action(() => {
    statsCommand();
  });

program
  .command('list')
  .description('List indexed documents')
  .action(() => {
    listCommand();
  });

program
  .command('repl')
  .description('Start interactive REPL mode')
  .action(async () => {
    await initModel(program.opts());
    await replCommand();
  });

// Default to REPL if no command given
program.action(async () => {
  await initModel(program.opts());
  await replCommand();
});

program.parse();
