import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s, 'utf8'),
    decryptString: (buf: Buffer) => buf.toString('utf8'),
  },
}));

vi.mock('electron-log/main', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../src/main/services/atomicJson', () => ({
  readJson: vi.fn(() => ({ keys: {} })),
  writeJsonAtomic: vi.fn(),
  withJsonLock: vi.fn((_path: string, fn: () => unknown) => Promise.resolve(fn())),
}));

vi.mock('../../../src/main/services/paths', () => ({
  getDataDir: vi.fn(() => '/mock/data'),
}));

import { normaliseStorefrontBridgeBaseUrl } from '../../../src/main/services/storefrontBridgeCredentials';

describe('normaliseStorefrontBridgeBaseUrl', () => {
  it('normalizes local development URLs to 127.0.0.1 origins', () => {
    expect(normaliseStorefrontBridgeBaseUrl('localhost:3002/admin')).toBe('http://127.0.0.1:3002');
    expect(normaliseStorefrontBridgeBaseUrl('http://localhost:3002/api/king/status')).toBe(
      'http://127.0.0.1:3002',
    );
  });

  it('defaults bare production domains to https', () => {
    expect(normaliseStorefrontBridgeBaseUrl('example-store.com/store')).toBe(
      'https://example-store.com',
    );
  });

  it('rejects non-local http origins', () => {
    expect(normaliseStorefrontBridgeBaseUrl('http://example-store.com')).toBe('');
  });
});
