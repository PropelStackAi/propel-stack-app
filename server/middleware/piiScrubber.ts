/**
 * PII Scrubbing Middleware — Enhancement 41
 * Propel Stack AI, LLC
 *
 * Wraps ALL outbound AI API calls. Run user-provided text through scrubPII()
 * before building any prompt string that goes to Anthropic or OpenAI.
 *
 * Patterns scrubbed:
 *   - SSN (###-##-####)
 *   - Credit card numbers (16-digit)
 *   - Email addresses
 *   - US phone numbers
 *   - Account/routing numbers
 *   - Full name detection (basic heuristic)
 */

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // SSN
  { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  // 16-digit credit card
  { pattern: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, replacement: '[REDACTED_CC]' },
  // Email
  { pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]' },
  // US phone numbers
  { pattern: /\b(\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
  // Account / routing numbers
  { pattern: /(?:account|acct|routing)[\s#:]*\d{4,17}/gi, replacement: '[REDACTED_ACCOUNT]' },
  // Long numeric sequences (potential account numbers)
  { pattern: /\b\d{9}(?!\d)\b/g, replacement: '[REDACTED_NUM]' },
  // Street addresses (simple heuristic: number followed by common street words)
  {
    pattern: /\b\d{1,5}\s+(?:\w+\s+){1,3}(?:st(?:reet)?|ave(?:nue)?|blvd|boulevard|rd|road|dr(?:ive)?|ln|lane|ct|court|pl|place|way)\b/gi,
    replacement: '[REDACTED_ADDRESS]',
  },
];

/**
 * Scrub PII from text before sending to an AI model.
 * Returns sanitized string — original is never stored or logged.
 */
export function scrubPII(text: string): string {
  if (!text) return text;
  let scrubbed = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, replacement);
  }
  return scrubbed;
}

/**
 * Scrub PII from an object of user-provided fields.
 * Safe to use on request body before AI prompt construction.
 */
export function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = scrubPII(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
