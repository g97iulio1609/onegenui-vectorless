import chalk from 'chalk';
import { state } from '../state.js';

export function statsCommand(): void {
  const { documents, graphStats, searchStats } = state.getStats();

  console.log(chalk.bold('\n--- Vectorless Stats ---\n'));
  console.log(`${chalk.cyan('Documents:')}      ${documents}`);
  console.log(`${chalk.cyan('Graph Nodes:')}    ${graphStats.nodeCount}`);
  console.log(`${chalk.cyan('Graph Edges:')}    ${graphStats.edgeCount}`);
  console.log(`${chalk.cyan('Communities:')}    ${graphStats.communityCount}`);
  console.log(`${chalk.cyan('Density:')}        ${graphStats.density.toFixed(4)}`);
  console.log(`${chalk.cyan('BM25 Terms:')}     ${searchStats.termCount}`);
  console.log(`${chalk.cyan('BM25 Nodes:')}     ${searchStats.nodeCount}`);
  console.log();
}

export function listCommand(): void {
  const docs = state.multiDoc.listDocuments();

  if (docs.length === 0) {
    console.log(chalk.yellow('No documents indexed.'));
    return;
  }

  console.log(chalk.bold(`\n--- ${docs.length} Indexed Documents ---\n`));
  for (const doc of docs) {
    console.log(`  ${chalk.cyan(doc.id)} ${chalk.dim('>')} ${chalk.white(doc.filename)}`);
  }
  console.log();
}
