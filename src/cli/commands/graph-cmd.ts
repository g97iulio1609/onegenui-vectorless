import chalk from 'chalk';
import { state } from '../state.js';

/** Show neighbors of a graph node */
export function graphNeighborsCommand(nodeId: string): void {
  try {
    const node = state.graph.getNode(nodeId);
    if (!node) {
      console.log(chalk.red(`Node not found: ${nodeId}`));
      return;
    }

    const neighbors = state.graph.getNeighbors(nodeId, { maxDepth: 1 });
    if (neighbors.length === 0) {
      console.log(chalk.yellow(`No neighbors found for ${nodeId}.`));
      return;
    }

    console.log(chalk.bold(`\nNeighbors of ${chalk.cyan(node.label)} (${neighbors.length}):\n`));
    for (const n of neighbors) {
      console.log(
        `  ${chalk.cyan(n.id)} ${chalk.dim(`[${n.type}]`)} ${chalk.white(n.label)}` +
        (n.documentId ? chalk.dim(` doc:${n.documentId}`) : ''),
      );
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/** Detect and list communities */
export function graphCommunitiesCommand(): void {
  try {
    const communities = state.graph.detectCommunities();
    if (communities.length === 0) {
      console.log(chalk.yellow('No communities detected.'));
      return;
    }

    console.log(chalk.bold(`\n--- ${communities.length} Communities ---\n`));
    for (const c of communities) {
      console.log(
        `  ${chalk.cyan(c.id)} ${chalk.dim(`(${c.nodeIds.length} nodes)`)} ` +
        `weight: ${chalk.green(c.weight.toFixed(3))}` +
        (c.summary ? ` ${chalk.dim(c.summary)}` : ''),
      );
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/** Find shortest path between two nodes */
export function graphPathCommand(from: string, to: string): void {
  try {
    const path = state.graph.findShortestPath(from, to);
    if (path.length === 0) {
      console.log(chalk.yellow(`No path found between ${from} and ${to}.`));
      return;
    }

    console.log(chalk.bold(`\nShortest path (${path.length} nodes):\n`));
    for (const [i, nodeId] of path.entries()) {
      const node = state.graph.getNode(nodeId);
      const label = node ? node.label : nodeId;
      const arrow = i < path.length - 1 ? chalk.dim(' ->') : '';
      console.log(`  ${chalk.cyan(nodeId)} ${chalk.white(label)}${arrow}`);
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/** List entities by type */
export function graphEntitiesCommand(type?: string): void {
  try {
    const nodes = type
      ? state.graph.findNodesByType(type as 'entity' | 'document' | 'section')
      : state.graph.findNodesByType('entity');

    if (nodes.length === 0) {
      console.log(chalk.yellow(`No entities found${type ? ` of type "${type}"` : ''}.`));
      return;
    }

    console.log(chalk.bold(`\n--- ${nodes.length} Entities${type ? ` (${type})` : ''} ---\n`));
    for (const n of nodes) {
      const entityType = n.properties['entityType'] as string | undefined;
      console.log(
        `  ${chalk.cyan(n.id)} ${chalk.white(n.label)}` +
        (entityType ? chalk.dim(` [${entityType}]`) : '') +
        (n.documentId ? chalk.dim(` doc:${n.documentId}`) : ''),
      );
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
}
