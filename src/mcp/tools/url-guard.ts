/** Block private/reserved IP ranges for SSRF protection */
export function isPrivateUrl(url: string): boolean {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  const privatePatterns = [
    /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^0\./, /^::1$/, /^fc00:/i, /^fd/i, /^fe80:/i,
    /^::ffff:/i,
    /^localhost$/i,
  ];
  return privatePatterns.some((p) => p.test(host));
}
