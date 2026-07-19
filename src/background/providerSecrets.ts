import browser from 'webextension-polyfill';

import { STORAGE_KEYS } from '../shared/constants/storage';
import { decryptText, encryptText, type EncryptedPayload } from '../shared/encryption/encryption';
import { AppError } from '../shared/errors/AppError';

export class ProviderSecretVault {
  private readonly sessionSecrets = new Map<string, string>();

  private storageKey(profileId: string): string {
    return `${STORAGE_KEYS.providerSecretPrefix}${profileId}`;
  }

  private sessionKey(profileId: string): string {
    return `providerSession.${profileId}`;
  }

  async isUnlocked(profileId: string): Promise<boolean> {
    if (this.sessionSecrets.has(profileId)) return true;
    if (!browser.storage.session) return false;
    const key = this.sessionKey(profileId);
    const stored = await browser.storage.session.get(key);
    return typeof stored[key] === 'string';
  }

  async hasEncryptedSecret(profileId: string): Promise<boolean> {
    const key = this.storageKey(profileId);
    const stored = await browser.storage.local.get(key);
    return stored[key] !== undefined;
  }

  async save(
    profileId: string,
    secret: string,
    mode: 'session' | 'encrypted-local',
    password?: string,
  ): Promise<void> {
    const value = secret.trim();
    if (!value) {
      throw new AppError('PROVIDER_KEY_MISSING', 'An API key is required for this provider.');
    }

    if (mode === 'encrypted-local') {
      if (!password) {
        throw new AppError(
          'ENCRYPTION_PASSWORD_MISSING',
          'A password is required for encrypted local key storage.',
        );
      }
      const encrypted = await encryptText(value, password);
      await browser.storage.local.set({ [this.storageKey(profileId)]: encrypted });
    } else {
      await browser.storage.local.remove(this.storageKey(profileId));
    }
    this.sessionSecrets.set(profileId, value);
    if (browser.storage.session) {
      await browser.storage.session.set({ [this.sessionKey(profileId)]: value });
    }
  }

  async unlock(profileId: string, password: string): Promise<void> {
    const key = this.storageKey(profileId);
    const stored = await browser.storage.local.get(key);
    if (!stored[key]) {
      throw new AppError('PROVIDER_KEY_MISSING', 'No encrypted key exists for this profile.');
    }
    try {
      const secret = await decryptText(stored[key] as EncryptedPayload, password);
      this.sessionSecrets.set(profileId, secret);
      if (browser.storage.session) {
        await browser.storage.session.set({ [this.sessionKey(profileId)]: secret });
      }
    } catch (error) {
      throw new AppError(
        'PROVIDER_UNLOCK_FAILED',
        'The provider key could not be unlocked. Check the password.',
        error,
      );
    }
  }

  async get(profileId: string): Promise<string> {
    let secret = this.sessionSecrets.get(profileId);
    if (!secret && browser.storage.session) {
      const key = this.sessionKey(profileId);
      const stored = await browser.storage.session.get(key);
      if (typeof stored[key] === 'string') {
        secret = stored[key];
        this.sessionSecrets.set(profileId, secret);
      }
    }
    if (!secret) {
      throw new AppError(
        'PROVIDER_KEY_LOCKED',
        'The provider key is not available in this background session. Unlock or enter it again.',
      );
    }
    return secret;
  }

  async delete(profileId: string): Promise<void> {
    this.sessionSecrets.delete(profileId);
    await browser.storage.local.remove(this.storageKey(profileId));
    if (browser.storage.session) {
      await browser.storage.session.remove(this.sessionKey(profileId));
    }
  }
}
