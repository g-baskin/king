import log from 'electron-log/main';
import { secureHandle } from './validateSender';
import {
  clearStorefrontBridgeCredentials,
  getStorefrontBridgeCredentials,
  normaliseStorefrontBridgeBaseUrl,
  setStorefrontBridgeCredentials,
} from '../services/storefrontBridgeCredentials';
import {
  addStorefrontBridgeProductImage,
  createStorefrontBridgeProduct,
  StorefrontBridgeApiError,
  getStorefrontBridgeStatus,
  listStorefrontBridgeCatalog,
  listStorefrontBridgeProducts,
  uploadStorefrontBridgeArtwork,
  type StorefrontBridgeProductCreateInput,
} from '../services/storefrontBridgeClient';

function wrap<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof StorefrontBridgeApiError) {
        log.warn('[storefrontBridge] api error', err.message, { status: err.status });
        const e = new Error(err.message) as Error & { code?: number };
        if (err.status !== undefined) e.code = err.status;
        throw e;
      }
      throw err;
    }
  };
}

function requireCreds() {
  const creds = getStorefrontBridgeCredentials();
  if (!creds) {
    throw new Error(
      'Storefront Bridge is not connected. Save the storefront origin and King API token in API Keys; KING validates {origin}/api/king/status.',
    );
  }
  return creds;
}

export function registerStorefrontBridgeHandlers(): void {
  secureHandle(
    'storefrontBridge:status',
    wrap(async () => {
      const creds = getStorefrontBridgeCredentials();
      if (!creds) return { connected: false };
      const status = await getStorefrontBridgeStatus(creds);
      return {
        connected: true,
        baseUrl: creds.baseUrl,
        serverUrl: status.serverUrl,
        printify: status.printify,
        media: status.media,
      };
    }),
  );

  secureHandle(
    'storefrontBridge:saveCredentials',
    wrap(async (_event, input: { baseUrl: string; apiToken: string }) => {
      const baseUrl = normaliseStorefrontBridgeBaseUrl(input.baseUrl ?? '');
      const apiToken = input.apiToken?.trim();
      if (!baseUrl) {
        throw new Error('Storefront URL must be HTTPS, or local http://127.0.0.1 / localhost.');
      }
      if (!apiToken) throw new Error('King API token is required.');

      const probe = { baseUrl, apiToken };
      const status = await getStorefrontBridgeStatus(probe);
      await setStorefrontBridgeCredentials({
        baseUrl,
        apiToken,
        serverUrl: status.serverUrl,
        printifyShopId: status.printify.shopId,
      });
      return status;
    }),
  );

  secureHandle(
    'storefrontBridge:clearCredentials',
    wrap(async () => clearStorefrontBridgeCredentials()),
  );

  secureHandle(
    'storefrontBridge:listCatalog',
    wrap(
      async (
        _event,
        query?: {
          resource?: 'blueprints' | 'providers' | 'variants';
          blueprintId?: number;
          printProviderId?: number;
          category?: string;
          search?: string;
          includeBlueprintId?: number;
        },
      ) => listStorefrontBridgeCatalog(requireCreds(), query),
    ),
  );

  secureHandle(
    'storefrontBridge:uploadArtwork',
    wrap(
      async (
        _event,
        input: {
          imageUrl: string;
          filename?: string;
          alt?: string;
          blueprintId: number;
          printProviderId: number;
          removeBackground?: boolean;
        },
      ) => uploadStorefrontBridgeArtwork(requireCreds(), input),
    ),
  );

  secureHandle(
    'storefrontBridge:createProduct',
    wrap(async (_event, input: StorefrontBridgeProductCreateInput) =>
      createStorefrontBridgeProduct(requireCreds(), input),
    ),
  );

  secureHandle(
    'storefrontBridge:listProducts',
    wrap(async (_event, limit?: number) => listStorefrontBridgeProducts(requireCreds(), limit)),
  );

  secureHandle(
    'storefrontBridge:addProductImage',
    wrap(
      async (
        _event,
        input: {
          productId: string | number;
          imageUrl: string;
          filename?: string;
          alt?: string;
          setAsFeatured?: boolean;
        },
      ) => addStorefrontBridgeProductImage(requireCreds(), input),
    ),
  );
}
