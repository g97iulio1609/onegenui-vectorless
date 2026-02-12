import chalk from 'chalk';
import { state } from '../state.js';

export function searchCommand(query: string): void {
  if (!query.trim()) {
    console.log(chalk.red('Empty query. Usage: vectorless search <query>'));
    return;
  }

  const results = state.bm25.search(query, { limit: 10 });

  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  console.log(chalk.bold(`\nFound ${results.length} results for "${query}":\n`));

  for (const [i, result] of results.entries()) {
    console.log(
      `${chalk.dim(`${i + 1}.`)} ${chalk.cyan(result.documentId)} ` +
      `${chalk.dim('>')} ${chalk.white(result.nodeId)} ` +
      `${chalk.dim(`[${result.field}]`)} ` +
      chalk.green(`score: ${result.score.toFixed(3)}`),
    );
    if (result.highlights.length > 0) {
      for (const h of result.highlights.slice(0, 2)) {
        console.log(`   ${chalk.dim(h)}`);
      }
    }
  }
  console.log();
}
