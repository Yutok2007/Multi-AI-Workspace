const SENSITIVE_KEY =
  /api[-_]?key|authorization|cookie|prompt|response|answer|email|account[-_]?id|uploaded[-_]?file|master[-_]?password|token|secret/i;
const CONVERSATION_KEY = /conversation[-_]?id/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

function maskIdentifier(value: unknown): string {
  const text = String(value);
  if (text.length <= 8) {
    return '[MASKED]';
  }
  return `${text.slice(0, 3)}…${text.slice(-3)}`;
}

function redactString(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]');
}

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return '[CIRCULAR]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = '[REDACTED]';
    } else if (CONVERSATION_KEY.test(key)) {
      output[key] = maskIdentifier(item);
    } else {
      output[key] = redact(item, seen);
    }
  }
  return output;
}
