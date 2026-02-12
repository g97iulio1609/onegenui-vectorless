import chalk from 'chalk';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { indexCommand } from './index-cmd.js';
import { searchCommand } from './search-cmd.js';
import { askCommand } from './ask-cmd.js';
import { statsCommand, listCommand } from './stats-cmd.js';

const HELP = `
${chalk.bold('Commands:')}
  ${chalk.cyan('/index <file>')}     Index a document
  ${chalk.cyan('/search <query>')}   BM25 search
  ${chalk.cyan('/ask <question>')}   AI Detective investigation
  ${chalk.cyan('/stats')}            Show statistics
  ${chalk.cyan('/list')}             List indexed documents
  ${chalk.cyan('/help')}             Show this help
  ${chalk.cyan('/exit')}             Exit REPL

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

    if (trimmed.startsWith('/ask ')) {
      const question = trimmed.slice(5).trim();
      await askCommand(question);
      continue;
    }

    // Default: treat as question for AI Detective
    await askCommand(trimmed);
  }
}
