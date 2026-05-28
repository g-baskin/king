import { clearCredentials, jsonCodec, loadCredentials, saveCredentials } from './credentialStore';

export interface StorefrontBridgeCredentials {
  /** Origin only, e.g. http://127.0.0.1:3002 or https://your-storefront.com. */
  baseUrl: string;
  /** Bearer token matching KING_API_TOKEN on the storefront. */
  apiToken: string;
  /** Cached metadata from the last successful validation. */
  serverUrl?: string;
  printifyShopId?: string | null;
}

const SERVICE = 'storefront-bridge';
const LEGACY_SERVICE = 'different-tees';

const codec = jsonCodec<StorefrontBridgeCredentials>((parsed) => {
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.baseUrl !== 'string' || !o.baseUrl) return null;
  if (typeof o.apiToken !== 'string' || !o.apiToken) return null;
  return {
    baseUrl: o.baseUrl,
    apiToken: o.apiToken,
    ...(typeof o.serverUrl === 'string' ? { serverUrl: o.serverUrl } : {}),
    ...(typeof o.printifyShopId === 'string' || o.printifyShopId === null
      ? { printifyShopId: o.printifyShopId }
      : {}),
  };
});

export function getStorefrontBridgeCredentials(): StorefrontBridgeCredentials | null {
  return loadCredentials(SERVICE, codec) ?? loadCredentials(LEGACY_SERVICE, codec);
}

export async function setStorefrontBridgeCredentials(
  credentials: StorefrontBridgeCredentials,
): Promise<void> {
  await saveCredentials(SERVICE, codec, credentials);
  await clearCredentials(LEGACY_SERVICE);
}

export async function clearStorefrontBridgeCredentials(): Promise<void> {
  await clearCredentials(SERVICE);
  await clearCredentials(LEGACY_SERVICE);
}

export function normaliseStorefrontBridgeBaseUrl(input: string): string {
  let raw = input.trim();
  if (!raw) return '';

  if (!/^https?:\/\//i.test(raw)) {
    raw = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }

  const isLocal =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
    return '';
  }

  parsed.username = '';
  parsed.password = '';
  parsed.pathname = '';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '').replace('://localhost', '://127.0.0.1');
}
