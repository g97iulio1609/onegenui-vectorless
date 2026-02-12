import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import { state } from '../state.js';
import type { DocumentKnowledgeBase } from '../../domain/schemas.js';

const DEFAULT_SESSION_PATH = '.vectorless-session.json';

interface SessionData {
  version: string;
  savedAt: string;
  knowledgeBases: DocumentKnowledgeBase[];
}

/** Save session state to a JSON file */
export async function saveSessionCommand(filePath?: string): Promise<void> {
  const resolved = path.resolve(filePath ?? DEFAULT_SESSION_PATH);
  const spinner = ora(`Saving session to ${chalk.cyan(resolved)}...`).start();

  try {
    const docs = state.multiDoc.listDocuments();
    const kbs: DocumentKnowledgeBase[] = [];
    for (const doc of docs) {
      const kb = state.multiDoc.getKnowledgeBase(doc.id);
      if (kb) kbs.push(kb);
    }

    const session: SessionData = {
      version: '3.0.0',
      savedAt: new Date().toISOString(),
      knowledgeBases: kbs,
    };

    await fs.writeFile(resolved, JSON.stringify(session, null, 2), 'utf-8');
    spinner.succeed(
      `Session saved: ${chalk.green(kbs.length)} knowledge bases to ${chalk.cyan(resolved)}`,
    );
  } catch (error) {
    spinner.fail(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Load session state from a JSON file */
export async function loadSessionCommand(filePath?: string): Promise<void> {
  const resolved = path.resolve(filePath ?? DEFAULT_SESSION_PATH);
  const spinner = ora(`Loading session from ${chalk.cyan(resolved)}...`).start();

  try {
    const content = await fs.readFile(resolved, 'utf-8');
    const session = JSON.parse(content) as SessionData;

    if (!session.knowledgeBases || !Array.isArray(session.knowledgeBases)) {
      spinner.fail('Invalid session file: missing knowledgeBases array.');
      return;
    }

    let count = 0;
    for (const kb of session.knowledgeBases) {
      state.addKB(kb);
      count++;
    }

    spinner.succeed(
      `Session loaded: ${chalk.green(count)} knowledge bases from ${chalk.cyan(resolved)}` +
      chalk.dim(` (saved: ${session.savedAt})`),
    );
  } catch (error) {
    spinner.fail(`Load failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
