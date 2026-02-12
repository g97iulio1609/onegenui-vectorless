import chalk from 'chalk';
import { state } from '../state.js';

/** Hybrid BM25 + Graph RRF search */
export async function hybridCommand(query: string): Promise<void> {
  if (!query.trim()) {
    console.log(chalk.red('Empty query. Usage: vectorless hybrid <query>'));
    return;
  }

  try {
    const results = await state.hybridSearch.search(query, { limit: 10 });

    if (results.length === 0) {
      console.log(chalk.yellow('No hybrid results found.'));
      return;
    }

    console.log(chalk.bold(`\nFound ${results.length} hybrid results for "${query}":\n`));

    for (const [i, result] of results.entries()) {
      const channels = result.channels
        .map((c) => `${c.channel}#${c.rank} ${c.score.toFixed(3)}`)
        .join(', ');

      console.log(
        `${chalk.dim(`${i + 1}.`)} ${chalk.cyan(result.documentId)} ` +
        `${chalk.dim('>')} ${chalk.white(result.nodeId)} ` +
        chalk.green(`fused: ${result.fusedScore.toFixed(4)}`) +
        chalk.dim(` [${channels}]`),
      );

      for (const h of result.highlights.slice(0, 2)) {
        console.log(`   ${chalk.dim(h)}`);
      }
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`Hybrid search failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}
