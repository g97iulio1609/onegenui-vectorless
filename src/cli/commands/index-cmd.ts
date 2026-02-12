import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import { state } from '../state.js';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.html': 'text/html',
  '.csv': 'text/csv',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export async function indexCommand(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) {
    console.log(chalk.red('No files specified. Usage: vectorless index <file1> [file2] ...'));
    return;
  }

  for (const filePath of filePaths) {
    const resolved = path.resolve(filePath);
    const filename = path.basename(resolved);
    const mimeType = getMimeType(resolved);
    const spinner = ora(`Indexing ${chalk.cyan(filename)}...`).start();

    try {
      const buffer = await fs.readFile(resolved);
      const { generateKnowledgeBase } = await import('../../index.js');
      const { knowledgeBase } = await generateKnowledgeBase(
        buffer.buffer as ArrayBuffer,
        filename,
        mimeType,
        {
          model: state.model,
          extractEntities: true,
          extractRelations: true,
          extractKeywords: true,
          generateSummaries: true,
        },
      );

      state.addKB(knowledgeBase);
      const stats = state.getStats();
      spinner.succeed(
        `${chalk.green(filename)} indexed — ${chalk.yellow(knowledgeBase.entities.length)} entities, ` +
        `${chalk.yellow(knowledgeBase.relations.length)} relations ` +
        `(${chalk.dim(`${stats.documents} docs total`)})`,
      );
    } catch (error) {
      spinner.fail(`Failed to index ${chalk.red(filename)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
