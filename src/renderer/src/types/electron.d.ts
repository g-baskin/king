export interface GeneratedImageData {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  prompt: string;
  aspectRatio: string;
  createdAt: string;
  filename: string;
  workspaceId?: string;
}

export interface EntityData {
  id: string;
  name: string;
  referenceImages: string[];
  thumbnailUrl: string | null;
  createdAt: string;
  productType?: string;
  primaryReferenceIndex?: number;
}

export interface CustomAdReferenceData {
  id: string;
  filename: string;
  url: string;
  aspectRatio: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface ApiKeyEntry {
  maskedKey: string;
  savedAt: string;
}

export interface StorefrontBridgeStatusResult {
  connected: boolean;
  baseUrl?: string;
  serverUrl?: string;
  printify?: {
    configured: boolean;
    shopId: string | null;
  };
  media?: {
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

export interface FbBusinessRef {
  id: string;
  name: string;
}

export interface FbAdAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number;
  business?: FbBusinessRef;
}

export interface FbPage {
  id: string;
  name: string;
}

export interface FbCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
}

export interface FbAdSet {
  id: string;
  name: string;
  campaign_id: string;
  daily_budget?: string;
  status: string;
}

export type FbObjective =
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_APP_PROMOTION';

export type FbCtaType =
  | 'SHOP_NOW'
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'DOWNLOAD'
  | 'GET_OFFER'
  | 'BOOK_TRAVEL'
  | 'CONTACT_US';

export interface FbStatusResult {
  connected: boolean;
  defaultAdAccountId?: string;
  defaultPageId?: string;
  /** Epoch ms when the long-lived token expires (60d window). Absent if
   *  we couldn't exchange (no FACEBOOK_APP_ID/_SECRET configured) or the
   *  user pasted a non-exchangeable token. */
  expiresAt?: number;
}

export interface FbCreateAdInput {
  adAccountId?: string;
  pageId?: string;
  campaignId?: string;
  newCampaign?: { name: string; objective: FbObjective };
  adSetId?: string;
  newAdSet?: {
    name: string;
    dailyBudget: number;
    countries: string[];
    ageMin: number;
    ageMax: number;
  };
  ad: {
    name: string;
    headline: string;
    message: string;
    link: string;
    ctaType: FbCtaType;
    status: 'ACTIVE' | 'PAUSED';
  };
  image: { filename: string; bytes: ArrayBuffer };
}

export interface FbCreateAdResult {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  imageHash: string;
  adAccountId: string;
}

export interface FbSaveCredentialsResult {
  adAccountCount: number;
  pageCount: number;
  defaultAdAccountId?: string;
  defaultPageId?: string;
}

export type UpdaterStage =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdaterStatus {
  stage: UpdaterStage;
  currentVersion: string;
  updateVersion?: string;
  releaseNotes?: string;
  progress?: number;
  bytesPerSecond?: number;
  error?: string;
}

export interface ElectronAPI {
  images: {
    list: (
      cursor?: string,
      limit?: number,
      workspaceId?: string,
    ) => Promise<{
      data: GeneratedImageData[];
      nextCursor: string | null;
      hasMore: boolean;
    }>;
    save: (data: {
      url: string;
      prompt: string;
      aspectRatio: string;
      workspaceId?: string;
    }) => Promise<GeneratedImageData>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  generate: {
    image: (data: {
      prompt: string;
      aspectRatio: string;
      resolution: string;
      outputFormat: string;
      imageUrls: string[];
      modelVariant?: 'nano_banana_pro' | 'gpt_image_2';
    }) => Promise<{ success: boolean; resultUrls: string[] }>;
    video: (data: {
      prompt: string;
      imageUrl: string;
      aspectRatio: string;
      durationSeconds?: 5 | 10;
    }) => Promise<{ success: boolean; videoUrl: string }>;
  };
  files: {
    download: (
      url: string,
      filename: string,
    ) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean }>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  log: {
    error: (level: string, message: string, stack?: string) => Promise<void>;
  };
  update: {
    getVersion: () => Promise<string>;
    getStatus: () => Promise<UpdaterStatus>;
    check: () => Promise<UpdaterStatus>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    onStatus: (callback: (status: UpdaterStatus) => void) => () => void;
  };
  apiKeys: {
    list: () => Promise<Record<string, ApiKeyEntry>>;
    set: (service: string, key: string) => Promise<{ success: boolean }>;
    delete: (service: string) => Promise<{ success: boolean }>;
  };
  facebookAds: {
    status: () => Promise<FbStatusResult>;
    saveCredentials: (input: {
      accessToken: string;
      defaultAdAccountId?: string;
      defaultPageId?: string;
    }) => Promise<FbSaveCredentialsResult>;
    beginOAuth: () => Promise<FbSaveCredentialsResult>;
    listAdAccounts: () => Promise<FbAdAccount[]>;
    listPages: () => Promise<FbPage[]>;
    listCampaigns: (adAccountId?: string) => Promise<FbCampaign[]>;
    listAdSets: (adAccountId?: string, campaignId?: string) => Promise<FbAdSet[]>;
    createAd: (request: FbCreateAdInput) => Promise<FbCreateAdResult>;
  };
  telegram?: {
    status: () => Promise<{ connected: boolean; identity?: { id: number; username?: string } }>;
    saveToken: (botToken: string) => Promise<{ id: number; username: string }>;
    sendMessage: (chatId: string | number, text: string) => Promise<{ messageId: number }>;
  };
  shopify?: {
    status: () => Promise<{
      connected: boolean;
      shopDomain?: string;
      shop?: { shopName: string; currency: string };
    }>;
    saveCredentials: (input: { shopDomain: string; accessToken: string }) => Promise<{
      shopName: string;
      currency: string;
    }>;
    listProducts: (
      limit?: number,
    ) => Promise<
      Array<{ id: string; title: string; status: string; vendor?: string; image?: string }>
    >;
    listOrders: (
      limit?: number,
    ) => Promise<
      Array<{ id: string; name: string; total: string; currency: string; createdAt: string }>
    >;
  };
  googleAds?: {
    status: () => Promise<{
      connected: boolean;
      loginCustomerId?: string;
      defaultCustomerId?: string;
      customerIds?: string[];
    }>;
    beginOAuth: () => Promise<{ customerIds: string[] }>;
    listCampaigns: (customerId?: string) => Promise<
      Array<{
        id: string;
        name: string;
        status: string;
        type: string;
        dailyBudget: number;
        spent: number;
        ctr: number;
        cpc: number;
        conversions: number;
        convRate: number;
        cpa: number;
        impressionShare: number;
        budgetResourceName?: string;
      }>
    >;
    pauseCampaign: (campaignId: string, customerId?: string) => Promise<{ success: boolean }>;
    resumeCampaign: (campaignId: string, customerId?: string) => Promise<{ success: boolean }>;
    updateBudget: (
      budgetId: string,
      amountMicros: number,
      customerId?: string,
    ) => Promise<{ success: boolean }>;
    listAudienceInsights: (customerId?: string) => Promise<
      Array<{
        title: string;
        metric: string;
        segments: Array<{ label: string; value: string; share: number }>;
      }>
    >;
  };
  tiktokShop?: {
    status: () => Promise<{ connected: boolean; shopId?: string; shopName?: string }>;
    beginOAuth: () => Promise<{ shopId: string; shopName?: string }>;
    listProducts: () => Promise<
      Array<{ id: string; title: string; status: string; price?: string; image?: string }>
    >;
    listOrders: () => Promise<
      Array<{ id: string; status: string; total?: string; createdAt: string }>
    >;
  };
  shopee?: {
    status: () => Promise<{ connected: boolean; shopId?: number }>;
    beginOAuth: () => Promise<{ shopId: number }>;
    listProducts: () => Promise<
      Array<{ id: number; name: string; price?: number; stock?: number; image?: string }>
    >;
    listOrders: () => Promise<
      Array<{ id: string; status: string; total?: string; createdAt: string }>
    >;
  };
  amazon?: {
    status: () => Promise<{
      connected: boolean;
      sellingPartnerId?: string;
      marketplaceIds?: string[];
    }>;
    beginOAuth: () => Promise<{ sellingPartnerId: string }>;
    listOrders: () => Promise<
      Array<{ id: string; status: string; total?: string; purchasedAt: string }>
    >;
    listCatalogItems: () => Promise<Array<{ asin: string; title?: string; brand?: string }>>;
  };
  storefrontBridge?: {
    status: () => Promise<StorefrontBridgeStatusResult>;
    saveCredentials: (input: { baseUrl: string; apiToken: string }) => Promise<{
      ok: boolean;
      service: string;
      version: number;
      serverUrl: string;
      printify: { configured: boolean; shopId: string | null };
      media: { publicUrlConfigured: boolean };
    }>;
    clearCredentials: () => Promise<void>;
    listCatalog: (query?: {
      resource?: 'blueprints' | 'providers' | 'variants';
      blueprintId?: number;
      printProviderId?: number;
      category?: string;
      search?: string;
      includeBlueprintId?: number;
    }) => Promise<StorefrontBridgeCatalogResponse>;
    uploadArtwork: (input: {
      imageUrl: string;
      filename?: string;
      alt?: string;
      blueprintId: number;
      printProviderId: number;
      removeBackground?: boolean;
    }) => Promise<StorefrontBridgeArtworkUploadResult>;
    createProduct: (input: {
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
    }) => Promise<StorefrontBridgeProductCreateResult>;
    listProducts: (limit?: number) => Promise<{
      items: StorefrontBridgeProductSummary[];
      total: number;
    }>;
    addProductImage: (input: {
      productId: string | number;
      imageUrl: string;
      filename?: string;
      alt?: string;
      setAsFeatured?: boolean;
    }) => Promise<StorefrontBridgeProductImageCreateResult>;
  };
  adReferences: {
    list: () => Promise<CustomAdReferenceData[]>;
    create: (data: {
      file: { name: string; buffer: ArrayBuffer };
      width: number;
      height: number;
      aspectRatio: string;
    }) => Promise<CustomAdReferenceData>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  entities: {
    list: (entityType: string, workspaceId?: string) => Promise<EntityData[]>;
    create: (
      entityType: string,
      data: {
        name: string;
        files: { name: string; buffer: ArrayBuffer }[];
        productType?: string;
        primaryReferenceIndex?: number;
        workspaceId?: string;
      },
    ) => Promise<EntityData>;
    update: (
      entityType: string,
      id: string,
      data: {
        name: string;
        existingImages: string[];
        newFiles: { name: string; buffer: ArrayBuffer }[];
        productType?: string;
        primaryReferenceIndex?: number;
      },
    ) => Promise<EntityData>;
    delete: (entityType: string, id: string, workspaceId?: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
  /** App version string, injected at build time from package.json. */
  const __APP_VERSION__: string;
}
