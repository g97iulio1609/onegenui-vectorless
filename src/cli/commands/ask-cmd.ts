import chalk from 'chalk';
import ora from 'ora';
import { state } from '../state.js';

export async function askCommand(question: string): Promise<void> {
  if (!question.trim()) {
    console.log(chalk.red('Empty question. Usage: vectorless ask <question>'));
    return;
  }

  const spinner = ora('AI Detective is investigating...').start();

  try {
    const result = await state.detective.investigate(question);

    spinner.stop();
    console.log(chalk.bold.blue('\n--- AI Detective Answer ---\n'));
    console.log(result.answer);

    if (result.thinking) {
      console.log(chalk.dim(`\n${result.thinking}`));
    }

    if (result.sources.length > 0) {
      console.log(chalk.bold('\nSources:'));
      for (const source of result.sources.slice(0, 5)) {
        console.log(
          `  ${chalk.cyan(source.documentId)} > ${chalk.white(source.nodeId)} ` +
          chalk.dim(`(relevance: ${source.relevance.toFixed(2)})`),
        );
        if (source.excerpt) {
          console.log(`  ${chalk.dim(source.excerpt.slice(0, 150))}...`);
        }
      }
    }
    console.log();
  } catch (error) {
    spinner.fail(
      `Investigation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
