import { AppError } from '../errors/AppError';

export interface ParsedOriginPermission {
  origin: string;
  matchPattern: string;
}

export function parseOriginPermission(input: string): ParsedOriginPermission {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch (error) {
    throw new AppError('INVALID_ORIGIN', 'Enter a complete http:// or https:// origin.', error);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new AppError(
      'UNSUPPORTED_ORIGIN_PROTOCOL',
      'Only http:// and https:// origins are supported.',
    );
  }
  if (url.username || url.password) {
    throw new AppError('ORIGIN_CONTAINS_CREDENTIALS', 'Origins must not include credentials.');
  }

  const origin = url.origin;
  return { origin, matchPattern: `${origin}/*` };
}
