const SENSITIVE_QUERY_NAME =
  /(?:^|[-_.])(token|api[-_]?key|auth|authorization|code|credential|password|secret|session|signature)(?:$|[-_.])/i;
const SENSITIVE_FRAGMENT =
  /(?:token|api[-_]?key|authorization|credential|password|secret|session|signature)=/i;

export function sanitizeConversationUrl(value: string): string {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  for (const name of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY_NAME.test(name)) url.searchParams.delete(name);
  }
  if (SENSITIVE_FRAGMENT.test(url.hash)) url.hash = '';
  return url.toString();
}

export function conversationIdFromUrl(value: string): string {
  const url = new URL(value);
  return `${url.pathname}${url.search}${url.hash}`;
}
