import chalk from 'chalk';
import ora from 'ora';
import { state } from '../state.js';

/** Strip HTML tags to extract text content */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Index a web URL */
export async function urlCommand(url: string): Promise<void> {
  if (!url.trim()) {
    console.log(chalk.red('Empty URL. Usage: vectorless url <url>'));
    return;
  }

  const spinner = ora(`Fetching ${chalk.cyan(url)}...`).start();

  try {
    const response = await fetch(url);
    if (!response.ok) {
      spinner.fail(`HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const rawContent = await response.text();

    const isHtml = contentType.includes('text/html') || rawContent.trimStart().startsWith('<');
    const textContent = isHtml ? stripHtml(rawContent) : rawContent;

    if (!textContent.trim()) {
      spinner.fail('No text content extracted from URL.');
      return;
    }

    spinner.text = `Generating knowledge base for ${chalk.cyan(url)}...`;

    const buffer = new TextEncoder().encode(textContent);
    const { generateKnowledgeBase } = await import('../../index.js');
    const filename = new URL(url).hostname + new URL(url).pathname.replace(/\//g, '_');
    const mimeType = isHtml ? 'text/html' : 'text/plain';

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
    spinner.succeed(
      `${chalk.green(url)} indexed — ${chalk.yellow(knowledgeBase.entities.length)} entities, ` +
      `${chalk.yellow(knowledgeBase.relations.length)} relations`,
    );
  } catch (error) {
    spinner.fail(`URL indexing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
