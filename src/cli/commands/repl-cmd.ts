import chalk from 'chalk';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { indexCommand } from './index-cmd.js';
import { searchCommand } from './search-cmd.js';
import { askCommand } from './ask-cmd.js';
import { statsCommand, listCommand } from './stats-cmd.js';
import { hybridCommand } from './hybrid-cmd.js';
import {
  graphNeighborsCommand, graphCommunitiesCommand,
  graphPathCommand, graphEntitiesCommand,
} from './graph-cmd.js';
import { exportCommand, importCommand } from './export-cmd.js';
import { saveSessionCommand, loadSessionCommand } from './session-cmd.js';
import { urlCommand } from './url-cmd.js';

const HELP = `
${chalk.bold('Commands:')}
  ${chalk.cyan('/index <file>')}            Index a document
  ${chalk.cyan('/search <query>')}          BM25 search
  ${chalk.cyan('/hybrid <query>')}          Hybrid BM25 + Graph search
  ${chalk.cyan('/ask <question>')}          AI Detective investigation
  ${chalk.cyan('/graph neighbors <id>')}    Show graph neighbors
  ${chalk.cyan('/graph communities')}       Detect communities
  ${chalk.cyan('/graph path <from> <to>')}  Shortest path
  ${chalk.cyan('/graph entities [type]')}   List entities
  ${chalk.cyan('/export <file>')}           Export KBs to JSON
  ${chalk.cyan('/import <file>')}           Import KBs from JSON
  ${chalk.cyan('/save [file]')}             Save session state
  ${chalk.cyan('/load [file]')}             Load session state
  ${chalk.cyan('/url <url>')}               Index a web URL
  ${chalk.cyan('/stats')}                   Show statistics
  ${chalk.cyan('/list')}                    List indexed documents
  ${chalk.cyan('/help')}                    Show this help
  ${chalk.cyan('/exit')}                    Exit REPL

  ${chalk.dim('Or just type a question to ask the AI Detective.')}
`;

export async function replCommand(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log(chalk.bold.blue('\n--- Vectorless Interactive REPL ---'));
  console.log(chalk.dim('Type /help for commands, or ask a question directly.\n'));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = await rl.question(chalk.green('vectorless> '));
    const trimmed = input.trim();
    if (!trimmed) continue;

    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log(chalk.dim('Goodbye!'));
      rl.close();
      break;
    }

    if (trimmed === '/help') {
      console.log(HELP);
      continue;
    }

    if (trimmed === '/stats') {
      statsCommand();
      continue;
    }

    if (trimmed === '/list') {
      listCommand();
      continue;
    }

    if (trimmed.startsWith('/index ')) {
      const files = trimmed.slice(7).trim().split(/\s+/);
      await indexCommand(files);
      continue;
    }

    if (trimmed.startsWith('/search ')) {
      const query = trimmed.slice(8).trim();
      searchCommand(query);
      continue;
    }

    if (trimmed.startsWith('/hybrid ')) {
      const query = trimmed.slice(8).trim();
      await hybridCommand(query);
      continue;
    }

    if (trimmed.startsWith('/graph ')) {
      const args = trimmed.slice(7).trim().split(/\s+/);
      const sub = args[0];
      if (sub === 'neighbors' && args[1]) {
        graphNeighborsCommand(args[1]);
      } else if (sub === 'communities') {
        graphCommunitiesCommand();
      } else if (sub === 'path' && args[1] && args[2]) {
        graphPathCommand(args[1], args[2]);
      } else if (sub === 'entities') {
        graphEntitiesCommand(args[1]);
      } else {
        console.log(chalk.red('Usage: /graph neighbors|communities|path|entities'));
      }
      continue;
    }

    if (trimmed.startsWith('/export ')) {
      const file = trimmed.slice(8).trim();
      await exportCommand(file);
      continue;
    }

    if (trimmed.startsWith('/import ')) {
      const file = trimmed.slice(8).trim();
      await importCommand(file);
      continue;
    }

    if (trimmed.startsWith('/save')) {
      const file = trimmed.slice(5).trim() || undefined;
      await saveSessionCommand(file);
      continue;
    }

    if (trimmed.startsWith('/load')) {
      const file = trimmed.slice(5).trim() || undefined;
      await loadSessionCommand(file);
      continue;
    }

    if (trimmed.startsWith('/url ')) {
      const url = trimmed.slice(5).trim();
      await urlCommand(url);
      continue;
    }

    if (trimmed.startsWith('/ask ')) {
      const question = trimmed.slice(5).trim();
      await askCommand(question);
      continue;
    }

    // Default: treat as question for AI Detective
    await askCommand(trimmed);
  }
}
