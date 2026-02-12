/** Format successful MCP tool response */
export function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/** Format error MCP tool response */
export function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: msg }], isError: true as const };
}
