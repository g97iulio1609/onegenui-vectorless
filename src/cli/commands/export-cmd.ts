import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import { state } from '../state.js';
import type { DocumentKnowledgeBase } from '../../domain/schemas.js';

/** Export all knowledge bases to a JSON file */
export async function exportCommand(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const spinner = ora(`Exporting knowledge bases to ${chalk.cyan(resolved)}...`).start();

  try {
    const docs = state.multiDoc.listDocuments();
    if (docs.length === 0) {
      spinner.warn('No documents to export.');
      return;
    }

    const kbs: DocumentKnowledgeBase[] = [];
    for (const doc of docs) {
      const kb = state.multiDoc.getKnowledgeBase(doc.id);
      if (kb) kbs.push(kb);
    }

    await fs.writeFile(resolved, JSON.stringify(kbs, null, 2), 'utf-8');
    spinner.succeed(`Exported ${chalk.green(kbs.length)} knowledge bases to ${chalk.cyan(resolved)}`);
  } catch (error) {
    spinner.fail(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Import knowledge bases from a JSON file */
export async function importCommand(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const spinner = ora(`Importing knowledge bases from ${chalk.cyan(resolved)}...`).start();

  try {
    const content = await fs.readFile(resolved, 'utf-8');
    const kbs = JSON.parse(content) as DocumentKnowledgeBase[];

    if (!Array.isArray(kbs)) {
      spinner.fail('Invalid format: expected a JSON array of knowledge bases.');
      return;
    }

    let count = 0;
    for (const kb of kbs) {
      state.addKB(kb);
      count++;
    }

    spinner.succeed(`Imported ${chalk.green(count)} knowledge bases from ${chalk.cyan(resolved)}`);
  } catch (error) {
    spinner.fail(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
