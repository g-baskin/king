import { readFile } from 'fs/promises';
import { basename } from 'path';
import { resolveLocalFileUrl } from './paths';
import type { StorefrontBridgeCredentials } from './storefrontBridgeCredentials';

export class StorefrontBridgeApiError extends Error {
  status?: number;
  detail?: unknown;

  constructor(message: string, opts: { status?: number; detail?: unknown } = {}) {
    super(message);
    this.name = 'StorefrontBridgeApiError';
    if (opts.status !== undefined) this.status = opts.status;
    if (opts.detail !== undefined) this.detail = opts.detail;
  }
}

export interface StorefrontBridgeStatus {
  ok: boolean;
  service: string;
  version: number;
  serverUrl: string;
  printify: {
    configured: boolean;
    shopId: string | null;
  };
  media: {
    publicUrlConfigured: boolean;
  };
}

export interface StorefrontBridgeBlueprint {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  images?: string[];
}

export interface StorefrontBridgeProvider {
  id: number;
  title: string;
}

export interface StorefrontBridgeVariant {
  id: number;
  title: string;
  options?: Record<string, string>;
  placeholders?: Array<{ position: string; width?: number; height?: number }>;
}

export interface StorefrontBridgeCatalogResponse {
  resource: string;
  items?:
    | StorefrontBridgeBlueprint[]
    | StorefrontBridgeProvider[]
    | { variants: StorefrontBridgeVariant[] };
  total?: number;
  catalogTotal?: number;
  categories?: unknown;
  blueprintId?: number;
  printProviderId?: number;
  printSpec?: {
    width: number;
    height: number;
    position: string;
    safeInsetPct: number;
    label: string;
  } | null;
}

export interface StorefrontBridgeArtworkUploadResult {
  mediaId: string | number;
  sourceMediaId: string | number;
  url: string | null;
  printSpec: {
    width: number;
    height: number;
    dpi: number;
    position: string;
    safeInsetPct: number;
    label: string;
    upscaled?: boolean;
    letterboxed?: boolean;
    coverCropped?: boolean;
  };
  backgroundRemovalSkipped?: boolean;
  backgroundRemovalReason?: string;
}

export interface StorefrontBridgeProductCreateInput {
  title: string;
  description?: string;
  mediaId: string | number;
  sourceMediaId?: string | number;
  blueprintId: number;
  printProviderId: number;
  variantIds: number[];
  retailPricesCents?: Record<string, number>;
  catalogCategory?: string;
  tags?: string[];
  designTitle?: string;
  prompt?: string;
  correlationId?: string;
}

export interface StorefrontBridgeProductCreateResult {
  printifyProductId: string;
  payloadProductId: string | number;
  created: boolean;
  storefrontPath: string;
  storefrontUrl: string | null;
  mockupUrls: string[];
  mockupsSynced: number;
  mockupsFailed: number;
  printifyMockupsPending: boolean;
  printifyShopId: string;
  printifyImageCount: number;
  selectedMockupCount: number;
  mockupDiagnostic?: string;
  printSpec: {
    width: number;
    height: number;
    dpi: number;
    coverCropped: boolean;
  };
}

export interface StorefrontBridgeProductSummary {
  id: string | number;
  title?: string;
  slug?: string;
  status?: string;
  printifyProductId?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  storefrontPath?: string | null;
  storefrontUrl?: string | null;
  updatedAt?: string;
}

export interface StorefrontBridgeProductImageCreateResult {
  productId: string | number;
  mediaId: string | number;
  imageUrl: string | null;
  imageAlt: string;
  setAsFeatured: boolean;
  storefrontPath: string | null;
  storefrontUrl: string | null;
  imageCount: number;
}

function endpoint(creds: StorefrontBridgeCredentials, path: string): string {
  return `${creds.baseUrl.replace(/\/$/, '')}/api${path}`;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const maybe = body as { error?: unknown; code?: unknown; detail?: unknown } | null;
    const message =
      typeof maybe?.error === 'string'
        ? maybe.error
        : `Storefront Bridge API returned HTTP ${res.status}`;
    throw new StorefrontBridgeApiError(message, { status: res.status, detail: body });
  }

  return body as T;
}

async function requestJson<T>(
  creds: StorefrontBridgeCredentials,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${creds.apiToken}`);
  headers.set('Accept', 'application/json');

  const res = await fetch(endpoint(creds, path), {
    ...init,
    headers,
  });
  return readJsonResponse<T>(res);
}

export async function getStorefrontBridgeStatus(
  creds: StorefrontBridgeCredentials,
): Promise<StorefrontBridgeStatus> {
  return requestJson<StorefrontBridgeStatus>(creds, '/king/status');
}

export async function listStorefrontBridgeCatalog(
  creds: StorefrontBridgeCredentials,
  query: {
    resource?: 'blueprints' | 'providers' | 'variants';
    blueprintId?: number;
    printProviderId?: number;
    category?: string;
    search?: string;
    includeBlueprintId?: number;
  } = {},
): Promise<StorefrontBridgeCatalogResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return requestJson<StorefrontBridgeCatalogResponse>(creds, `/king/catalog${suffix}`);
}

function mimeTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

async function localFileToBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  const filePath = resolveLocalFileUrl(url);
  if (!filePath) {
    throw new StorefrontBridgeApiError(
      'Only saved local-file:// images can be uploaded to Storefront Bridge',
    );
  }
  const bytes = await readFile(filePath);
  const filename = basename(filePath);
  const blob = new Blob([bytes], { type: mimeTypeForFilename(filename) });
  return { blob, filename };
}

export async function uploadStorefrontBridgeArtwork(
  creds: StorefrontBridgeCredentials,
  input: {
    imageUrl: string;
    filename?: string;
    alt?: string;
    blueprintId: number;
    printProviderId: number;
    removeBackground?: boolean;
  },
): Promise<StorefrontBridgeArtworkUploadResult> {
  const { blob, filename } = await localFileToBlob(input.imageUrl);
  const form = new FormData();
  form.set('file', blob, input.filename?.trim() || filename);
  form.set('blueprintId', String(input.blueprintId));
  form.set('printProviderId', String(input.printProviderId));
  form.set('removeBackground', input.removeBackground ? 'true' : 'false');
  if (input.alt?.trim()) form.set('alt', input.alt.trim());

  return requestJson<StorefrontBridgeArtworkUploadResult>(creds, '/king/artwork', {
    method: 'POST',
    body: form,
  });
}

export async function createStorefrontBridgeProduct(
  creds: StorefrontBridgeCredentials,
  input: StorefrontBridgeProductCreateInput,
): Promise<StorefrontBridgeProductCreateResult> {
  return requestJson<StorefrontBridgeProductCreateResult>(creds, '/king/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function listStorefrontBridgeProducts(
  creds: StorefrontBridgeCredentials,
  limit = 24,
): Promise<{ items: StorefrontBridgeProductSummary[]; total: number }> {
  return requestJson<{ items: StorefrontBridgeProductSummary[]; total: number }>(
    creds,
    `/king/products?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function addStorefrontBridgeProductImage(
  creds: StorefrontBridgeCredentials,
  input: {
    productId: string | number;
    imageUrl: string;
    filename?: string;
    alt?: string;
    setAsFeatured?: boolean;
  },
): Promise<StorefrontBridgeProductImageCreateResult> {
  const { blob, filename } = await localFileToBlob(input.imageUrl);
  const form = new FormData();
  form.set('file', blob, input.filename?.trim() || filename);
  form.set('productId', String(input.productId));
  form.set('setAsFeatured', input.setAsFeatured ? 'true' : 'false');
  if (input.alt?.trim()) form.set('alt', input.alt.trim());

  return requestJson<StorefrontBridgeProductImageCreateResult>(creds, '/king/product-images', {
    method: 'POST',
    body: form,
  });
}
