import { PROVIDER_PRESETS, type ApiProfileInput } from '../shared/ai/types';
import { AppError } from '../shared/errors/AppError';
import { WorkspaceDatabase } from '../shared/storage/indexedDb';
import type { ApiProfileMetadataRecord } from '../shared/types/records';
import { ProviderSecretVault } from './providerSecrets';

export function validateProviderEndpoint(endpoint: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint.replace('{model}', 'model'));
  } catch (error) {
    throw new AppError('PROVIDER_ENDPOINT_INVALID', 'Enter a valid provider endpoint URL.', error);
  }
  if (url.username || url.password) {
    throw new AppError(
      'PROVIDER_ENDPOINT_CREDENTIALS_FORBIDDEN',
      'Provider endpoint URLs cannot contain embedded credentials.',
    );
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new AppError(
      'PROVIDER_ENDPOINT_INSECURE',
      'Provider endpoints must use HTTPS, except localhost development endpoints.',
    );
  }
  return url;
}

export class ProviderProfileService {
  constructor(
    private readonly database = new WorkspaceDatabase(),
    private readonly secrets = new ProviderSecretVault(),
  ) {}

  async list(): Promise<Array<{ profile: ApiProfileMetadataRecord; unlocked: boolean }>> {
    const profiles = await this.database.getAll('apiProfiles');
    return Promise.all(
      profiles
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(async (profile) => ({
          profile,
          unlocked:
            profile.providerType === 'ollama' ||
            !profile.hasSecret ||
            (await this.secrets.isUnlocked(profile.id)),
        })),
    );
  }

  async save(input: ApiProfileInput): Promise<ApiProfileMetadataRecord> {
    const now = Date.now();
    const id = input.id ?? crypto.randomUUID();
    const existing = await this.database.get('apiProfiles', id);
    const endpoint = input.endpoint.trim();
    const endpointUrl = validateProviderEndpoint(endpoint);
    const needsKey =
      input.providerType === 'openai-compatible' ||
      PROVIDER_PRESETS[input.providerType]?.needsKey === true;
    let hasSecret = existing?.hasSecret ?? false;

    if (
      existing?.hasSecret &&
      existing.secretStorage !== input.secretStorage &&
      !input.apiKey?.trim()
    ) {
      throw new AppError(
        'PROVIDER_KEY_REQUIRED_FOR_STORAGE_CHANGE',
        'Enter the API key again when changing its storage mode.',
      );
    }

    if (input.apiKey?.trim()) {
      await this.secrets.save(id, input.apiKey, input.secretStorage, input.encryptionPassword);
      hasSecret = true;
    } else if (needsKey && !hasSecret) {
      throw new AppError('PROVIDER_KEY_MISSING', 'Enter an API key for this provider.');
    }

    const profile: ApiProfileMetadataRecord = {
      id,
      providerType: input.providerType,
      name: input.name.trim() || input.providerType,
      endpoint,
      baseUrlOrigin: endpointUrl.origin,
      model: input.model.trim(),
      secretStorage: input.secretStorage,
      hasSecret,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!profile.model) {
      throw new AppError('PROVIDER_MODEL_MISSING', 'Enter a model name.');
    }
    await this.database.put('apiProfiles', profile);
    return profile;
  }

  async unlock(profileId: string, password: string): Promise<void> {
    const profile = await this.database.get('apiProfiles', profileId);
    if (!profile) throw new AppError('PROVIDER_PROFILE_NOT_FOUND', 'Provider profile not found.');
    await this.secrets.unlock(profileId, password);
  }

  async delete(profileId: string): Promise<void> {
    await this.database.delete('apiProfiles', profileId);
    await this.secrets.delete(profileId);
  }

  async getForRequest(
    profileId: string,
  ): Promise<{ profile: ApiProfileMetadataRecord; apiKey: string | null }> {
    const profile = await this.database.get('apiProfiles', profileId);
    if (!profile) throw new AppError('PROVIDER_PROFILE_NOT_FOUND', 'Provider profile not found.');
    const apiKey =
      profile.providerType === 'ollama' || !profile.hasSecret
        ? null
        : await this.secrets.get(profileId);
    return { profile, apiKey };
  }
}
