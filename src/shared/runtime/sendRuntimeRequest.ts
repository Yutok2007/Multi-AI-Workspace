import browser from 'webextension-polyfill';

import { AppError } from '../errors/AppError';
import type { RuntimeRequest, RuntimeResponse } from '../types/messages';

export async function sendRuntimeRequest(
  request: RuntimeRequest,
): Promise<Extract<RuntimeResponse, { ok: true }>> {
  const response = (await browser.runtime.sendMessage(request)) as RuntimeResponse;
  if (!response.ok) throw new AppError(response.error.code, response.error.message);
  return response;
}
