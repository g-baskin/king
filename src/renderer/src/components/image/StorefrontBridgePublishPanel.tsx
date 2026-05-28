import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  StorefrontBridgeBlueprint,
  StorefrontBridgeProductSummary,
  StorefrontBridgeProvider,
  StorefrontBridgeVariant,
} from '@/types/electron';
import type { GeneratedImage } from './types';

type PublishStep = 'idle' | 'uploading' | 'creating';
type BridgeMode = 'existing' | 'new';

interface StorefrontBridgePublishPanelProps {
  image: GeneratedImage;
}

function hasNumericId(item: unknown): item is { id: number } {
  return (
    typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'number'
  );
}

function isBlueprintArray(items: unknown): items is StorefrontBridgeBlueprint[] {
  return Array.isArray(items) && items.every(hasNumericId);
}

function isProviderArray(items: unknown): items is StorefrontBridgeProvider[] {
  return Array.isArray(items) && items.every(hasNumericId);
}

function variantsFromItems(items: unknown): StorefrontBridgeVariant[] {
  if (!items || typeof items !== 'object' || !('variants' in items)) return [];
  const variants = (items as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) return [];
  return variants.filter((variant): variant is StorefrontBridgeVariant => hasNumericId(variant));
}

function defaultTitle(prompt: string): string {
  const clean = prompt
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s'-]/g, '')
    .trim();
  if (!clean) return 'Storefront Bridge Artwork';
  return clean.length > 56 ? `${clean.slice(0, 56).trim()}…` : clean;
}

function variantLabel(variant: StorefrontBridgeVariant): string {
  const optionText = variant.options
    ? Object.entries(variant.options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ')
    : '';
  return optionText ? `${variant.title} — ${optionText}` : variant.title;
}

function productLabel(product: StorefrontBridgeProductSummary): string {
  const status = product.status ? ` · ${product.status}` : '';
  return `${product.title ?? product.slug ?? product.id}${status}`;
}

export function StorefrontBridgePublishPanel({ image }: StorefrontBridgePublishPanelProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [printifyConfigured, setPrintifyConfigured] = useState(false);
  const [mode, setMode] = useState<BridgeMode>('existing');
  const [products, setProducts] = useState<StorefrontBridgeProductSummary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [setAsFeatured, setSetAsFeatured] = useState(false);
  const [blueprints, setBlueprints] = useState<StorefrontBridgeBlueprint[]>([]);
  const [providers, setProviders] = useState<StorefrontBridgeProvider[]>([]);
  const [variants, setVariants] = useState<StorefrontBridgeVariant[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [title, setTitle] = useState(() => defaultTitle(image.prompt));
  const [description, setDescription] = useState(image.prompt);
  const [priceDollars, setPriceDollars] = useState('29.99');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [step, setStep] = useState<PublishStep>('idle');
  const [productUrl, setProductUrl] = useState<string | null>(null);

  const canAttach =
    connected === true &&
    mode === 'existing' &&
    selectedProductId.length > 0 &&
    title.trim().length > 0;

  const canCreate =
    connected === true &&
    printifyConfigured &&
    mode === 'new' &&
    selectedBlueprintId !== null &&
    selectedProviderId !== null &&
    selectedVariantIds.length > 0 &&
    title.trim().length > 0;

  const canPublish = (canAttach || canCreate) && step === 'idle';

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedCountLabel = useMemo(() => {
    if (selectedVariantIds.length === 0) return 'No variants selected';
    return `${selectedVariantIds.length} variant${selectedVariantIds.length === 1 ? '' : 's'} selected`;
  }, [selectedVariantIds.length]);

  useEffect(() => {
    setTitle(defaultTitle(image.prompt));
    setDescription(image.prompt);
    setProductUrl(null);
  }, [image.id, image.prompt]);

  useEffect(() => {
    let cancelled = false;
    if (!window.api.storefrontBridge) {
      setConnected(false);
      return;
    }

    void (async () => {
      try {
        const status = await window.api.storefrontBridge!.status();
        if (cancelled) return;
        const bridgeConnected = status.connected;
        const hasPrintify = status.printify?.configured ?? false;
        setConnected(bridgeConnected);
        setPrintifyConfigured(hasPrintify);
        if (!bridgeConnected) return;

        const productResult = await window.api.storefrontBridge!.listProducts(100);
        if (cancelled) return;
        setProducts(productResult.items ?? []);
        setSelectedProductId((current) => current || String(productResult.items?.[0]?.id ?? ''));

        if (!hasPrintify) return;
        const catalog = await window.api.storefrontBridge!.listCatalog({
          resource: 'blueprints',
          category: 'tshirt',
        });
        if (cancelled) return;
        if (isBlueprintArray(catalog.items)) {
          setBlueprints(catalog.items.slice(0, 36));
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProviders([]);
    setVariants([]);
    setSelectedProviderId(null);
    setSelectedVariantIds([]);
    if (!selectedBlueprintId || !window.api.storefrontBridge) return;

    void (async () => {
      try {
        const catalog = await window.api.storefrontBridge!.listCatalog({
          resource: 'providers',
          blueprintId: selectedBlueprintId,
        });
        if (cancelled) return;
        if (isProviderArray(catalog.items)) setProviders(catalog.items);
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : 'Could not load providers.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBlueprintId]);

  useEffect(() => {
    let cancelled = false;
    setVariants([]);
    setSelectedVariantIds([]);
    if (!selectedBlueprintId || !selectedProviderId || !window.api.storefrontBridge) return;

    void (async () => {
      try {
        const catalog = await window.api.storefrontBridge!.listCatalog({
          resource: 'variants',
          blueprintId: selectedBlueprintId,
          printProviderId: selectedProviderId,
        });
        if (cancelled) return;
        const nextVariants = variantsFromItems(catalog.items).slice(0, 60);
        setVariants(nextVariants);
        setSelectedVariantIds(nextVariants.slice(0, 6).map((variant) => variant.id));
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : 'Could not load variants.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBlueprintId, selectedProviderId]);

  const toggleVariant = (variantId: number) => {
    setSelectedVariantIds((current) =>
      current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId],
    );
  };

  const attachToExistingProduct = async () => {
    if (!window.api.storefrontBridge || !selectedProductId) return;
    setStep('uploading');
    const attached = await window.api.storefrontBridge.addProductImage({
      productId: selectedProductId,
      imageUrl: image.url,
      alt: title.trim() || selectedProduct?.title || 'Product mockup',
      setAsFeatured,
    });
    setProductUrl(attached.storefrontUrl);
    toast.success(
      `${setAsFeatured ? 'Set main image and added mockup' : 'Added mockup'} — ${attached.storefrontPath ?? selectedProduct?.title ?? 'product'}`,
    );
  };

  const createNewProduct = async () => {
    if (!window.api.storefrontBridge || !selectedBlueprintId || !selectedProviderId) return;
    const retailCents = Math.max(100, Math.round(Number(priceDollars) * 100));
    const retailPricesCents = Object.fromEntries(
      selectedVariantIds.map((variantId) => [String(variantId), retailCents]),
    );

    setStep('uploading');
    const uploaded = await window.api.storefrontBridge.uploadArtwork({
      imageUrl: image.url,
      alt: title.trim(),
      blueprintId: selectedBlueprintId,
      printProviderId: selectedProviderId,
      removeBackground,
    });

    setStep('creating');
    const created = await window.api.storefrontBridge.createProduct({
      title: title.trim(),
      description: description.trim() || title.trim(),
      mediaId: uploaded.mediaId,
      sourceMediaId: uploaded.sourceMediaId,
      blueprintId: selectedBlueprintId,
      printProviderId: selectedProviderId,
      variantIds: selectedVariantIds,
      retailPricesCents,
      designTitle: title.trim(),
      prompt: image.prompt,
    });

    setProductUrl(created.storefrontUrl);
    toast.success(`Created product via Storefront Bridge — ${created.storefrontPath}`);
  };

  const publish = async () => {
    try {
      if (mode === 'existing') {
        await attachToExistingProduct();
      } else {
        await createNewProduct();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Storefront Bridge publish failed.');
    } finally {
      setStep('idle');
    }
  };

  if (connected === false) {
    return (
      <section className="rounded-2xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] p-4">
        <p className="text-xs font-semibold tracking-wider text-[var(--base-color-brand--umber)]">
          STOREFRONT BRIDGE
        </p>
        <p className="mt-2 text-sm text-[var(--text-color--text-primary)]">
          Connect Storefront Bridge in API Keys. The storefront URL must serve /api/king/status.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider text-[var(--base-color-brand--umber)]">
          STOREFRONT BRIDGE
        </p>
        {productUrl && (
          <button
            type="button"
            onClick={() => window.api.shell.openExternal(productUrl)}
            className="text-xs font-semibold text-[var(--base-color-brand--cinamon)] hover:text-[var(--base-color-brand--red)]"
          >
            Open product →
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-full border border-[var(--base-color-brand--umber)]/25 bg-[var(--base-color-brand--champagne)] p-1">
        <button
          type="button"
          onClick={() => setMode('existing')}
          className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
            mode === 'existing'
              ? 'bg-[var(--base-color-brand--cinamon)] text-[var(--base-color-brand--shell)]'
              : 'text-[var(--base-color-brand--umber)]'
          }`}
        >
          Add to product
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
            mode === 'new'
              ? 'bg-[var(--base-color-brand--cinamon)] text-[var(--base-color-brand--shell)]'
              : 'text-[var(--base-color-brand--umber)]'
          }`}
        >
          Create product
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={mode === 'existing' ? 'Mockup alt text' : 'Product title'}
          className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
        />

        {mode === 'existing' ? (
          <>
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
            >
              <option value="">Choose existing store product</option>
              {products.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {productLabel(product)}
                </option>
              ))}
            </select>
            {selectedProduct?.storefrontPath && (
              <p className="px-1 text-[10px] text-[var(--base-color-brand--umber)]">
                Target: {selectedProduct.storefrontPath}
              </p>
            )}
            <label className="flex items-center gap-2 rounded-full border border-[var(--base-color-brand--umber)]/30 px-3 py-2 text-xs text-[var(--base-color-brand--umber)]">
              <input
                type="checkbox"
                checked={setAsFeatured}
                onChange={(event) => setSetAsFeatured(event.target.checked)}
              />
              Set this mockup as the main product image
            </label>
          </>
        ) : (
          <>
            {!printifyConfigured && (
              <p className="rounded-2xl border border-[var(--base-color-brand--umber)]/20 p-3 text-xs text-[var(--base-color-brand--umber)]">
                Creating new products requires Printify on the storefront. Adding mockups to
                existing products only needs the Storefront Bridge token.
              </p>
            )}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Product description"
              rows={3}
              className="resize-none rounded-2xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
            />
            <select
              value={selectedBlueprintId ?? ''}
              onChange={(event) => setSelectedBlueprintId(Number(event.target.value) || null)}
              className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
            >
              <option value="">Choose product type</option>
              {blueprints.map((blueprint) => (
                <option key={blueprint.id} value={blueprint.id}>
                  {blueprint.title}
                </option>
              ))}
            </select>
            <select
              value={selectedProviderId ?? ''}
              onChange={(event) => setSelectedProviderId(Number(event.target.value) || null)}
              disabled={!selectedBlueprintId}
              className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none disabled:opacity-50"
            >
              <option value="">Choose print provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.title}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={priceDollars}
                onChange={(event) => setPriceDollars(event.target.value)}
                inputMode="decimal"
                placeholder="Retail price"
                className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] px-4 py-2 text-xs text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
              />
              <label className="flex items-center gap-2 rounded-full border border-[var(--base-color-brand--umber)]/30 px-3 text-xs text-[var(--base-color-brand--umber)]">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(event) => setRemoveBackground(event.target.checked)}
                />
                Remove BG
              </label>
            </div>
          </>
        )}
      </div>

      {mode === 'new' && variants.length > 0 && (
        <div className="mt-3 rounded-2xl border border-[var(--base-color-brand--umber)]/20 p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--base-color-brand--umber)]">
            {selectedCountLabel}
          </p>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto pr-1">
            {variants.map((variant) => (
              <label
                key={variant.id}
                className="flex items-center gap-2 text-xs text-[var(--text-color--text-primary)]"
              >
                <input
                  type="checkbox"
                  checked={selectedVariantIds.includes(variant.id)}
                  onChange={() => toggleVariant(variant.id)}
                />
                <span className="line-clamp-1">{variantLabel(variant)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === 'existing' && products.length === 0 && (
        <p className="mt-3 rounded-2xl border border-[var(--base-color-brand--umber)]/20 p-3 text-xs text-[var(--base-color-brand--umber)]">
          No store products found yet. Create or sync a product on the storefront first, or use
          Create product.
        </p>
      )}

      <button
        type="button"
        onClick={() => void publish()}
        disabled={!canPublish}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-full border-none bg-[var(--base-color-brand--cinamon)] text-sm font-semibold tracking-wide text-[var(--base-color-brand--shell)] shadow-[0_3px_0_0_var(--base-color-brand--dark-red)] transition-all hover:bg-[var(--base-color-brand--red)] active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--base-color-brand--dark-red)] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
      >
        {step === 'uploading'
          ? mode === 'existing'
            ? 'Adding mockup…'
            : 'Uploading artwork…'
          : step === 'creating'
            ? 'Creating product…'
            : mode === 'existing'
              ? 'Add mockup to product'
              : 'Create product'}
      </button>
    </section>
  );
}
