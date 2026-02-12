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
import { hybridCommand } from './commands/hybrid-cmd.js';
import {
  graphNeighborsCommand, graphCommunitiesCommand,
  graphPathCommand, graphEntitiesCommand,
} from './commands/graph-cmd.js';
import { exportCommand, importCommand } from './commands/export-cmd.js';
import { saveSessionCommand, loadSessionCommand } from './commands/session-cmd.js';
import { urlCommand } from './commands/url-cmd.js';

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

program
  .command('hybrid <query...>')
  .description('Hybrid BM25 + Graph RRF search')
  .action(async (queryParts: string[]) => {
    await hybridCommand(queryParts.join(' '));
  });

const graphCmd = new Command('graph').description('Graph exploration commands');

graphCmd
  .command('neighbors <nodeId>')
  .description('Show neighbors of a graph node')
  .action((nodeId: string) => { graphNeighborsCommand(nodeId); });

graphCmd
  .command('communities')
  .description('Detect and list communities')
  .action(() => { graphCommunitiesCommand(); });

graphCmd
  .command('path <from> <to>')
  .description('Find shortest path between two nodes')
  .action((from: string, to: string) => { graphPathCommand(from, to); });

graphCmd
  .command('entities [type]')
  .description('List entities, optionally filtered by type')
  .action((type?: string) => { graphEntitiesCommand(type); });

program.addCommand(graphCmd);

program
  .command('export <file>')
  .description('Export knowledge bases to JSON file')
  .action(async (file: string) => { await exportCommand(file); });

program
  .command('import <file>')
  .description('Import knowledge bases from JSON file')
  .action(async (file: string) => { await importCommand(file); });

program
  .command('save [file]')
  .description('Save session state to file')
  .action(async (file?: string) => { await saveSessionCommand(file); });

program
  .command('load [file]')
  .description('Load session state from file')
  .action(async (file?: string) => { await loadSessionCommand(file); });

program
  .command('url <url>')
  .description('Index a web URL')
  .action(async (url: string) => {
    await initModel(program.opts());
    await urlCommand(url);
  });

// Default to REPL if no command given
program.action(async () => {
  await initModel(program.opts());
  await replCommand();
});

program.parse();
