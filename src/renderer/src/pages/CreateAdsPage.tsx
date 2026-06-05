import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DeleteIcon,
  PlusIcon,
  SparkleIcon,
} from '@/components/icons';
import ImageDetailOverlay from '@/components/image/ImageDetailOverlay';
import type { GeneratedImage } from '@/components/image/types';
import Badge from '@/components/ui/Badge';
import {
  AD_CATEGORY_LABELS,
  AD_REFERENCES,
  getThumbnail,
  pickVariant,
  type AdReference,
  type AdVariant,
} from '@/lib/adReferences';
import { readImageDimensions } from '@/lib/aspectRatio';
import {
  useCreateAdsStore,
  type CreateAdsOutputMode,
  type ResultSlot,
  type StepId,
} from '@/stores/createAdsStore';
import type { CustomAdReferenceData, EntityData, GeneratedImageData } from '@/types/electron';
import { useImagesStore } from '@/stores/imagesStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { kingApi } from '@/lib/kingApi';

// Image MIME types we accept for custom ad-reference uploads. Matches the
// formats Gemini's image input handles end-to-end (PNG, JPEG, WebP, HEIC,
// HEIF) so a successful upload always survives the generation pipeline.
const CUSTOM_AD_ACCEPT = 'image/png,image/jpeg,image/webp,image/heic,image/heif';
const MAX_CUSTOM_AD_BYTES = 15 * 1024 * 1024;

function customRefToAdReference(ref: CustomAdReferenceData): AdReference {
  return {
    id: `custom-${ref.id}`,
    category: 'custom',
    variants: [{ aspectRatio: ref.aspectRatio, imageUrl: ref.url }],
    isCustom: true,
    createdAt: ref.createdAt,
  };
}

// Create Ads offers a curated set of ad-relevant aspect ratios. Plain
// numeric labels ("1:1") confuse non-technical users, so each tile is
// labelled with the format's name and its typical placement.
interface AdAspectRatio {
  value: string;
  label: string;
  description: string;
  /** Visual preview dimensions in pixels — matches the ratio. */
  width: number;
  height: number;
}

const AD_ASPECT_RATIOS: AdAspectRatio[] = [
  { value: '1:1', label: 'Square', description: 'Feed posts', width: 48, height: 48 },
  { value: '4:5', label: 'Portrait', description: 'Feed ads', width: 40, height: 50 },
  { value: '9:16', label: 'Vertical', description: 'Stories & Reels', width: 30, height: 53 },
  { value: '16:9', label: 'Landscape', description: 'Link ads', width: 56, height: 32 },
];

interface StepDefinition {
  id: StepId;
  label: string;
  title: string;
  hint?: string;
}

const WIZARD_STEPS: StepDefinition[] = [
  { id: 'ad', label: 'Style', title: 'Pick an ad style' },
  { id: 'product', label: 'Product', title: 'Pick your product' },
  {
    id: 'brief',
    label: 'Brief',
    title: 'Describe your product',
    hint: "A sentence or two — what it is, who it's for, key benefits. This guides scene, props, and any text the model renders.",
  },
  { id: 'format', label: 'Format', title: 'Format and generate' },
  {
    id: 'animate',
    label: 'Animate',
    title: 'Animate your winning creative',
    hint: 'Use one of these copy-ready prompts in your image-to-video tool.',
  },
];

interface QuickPreset {
  id: string;
  label: string;
  category: AdReference['category'];
  defaultAspectRatio: string;
  brief: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'ugc',
    label: 'UGC vibe',
    category: 'mannequin',
    defaultAspectRatio: '9:16',
    brief:
      'Natural handheld-style social ad for mobile-first audiences. Show authentic lifestyle context and a clear benefit. If adding copy, keep it short and quote it like "Try it tonight".',
  },
  {
    id: 'studio',
    label: 'Clean studio',
    category: 'health',
    defaultAspectRatio: '1:1',
    brief:
      'Minimal studio setup with premium lighting and clean surfaces. Emphasize product texture, readability, and trust. Optional headline in quotes only, e.g. "Pure daily support".',
  },
  {
    id: 'promo',
    label: 'Bold promo',
    category: 'supp',
    defaultAspectRatio: '4:5',
    brief:
      'High-contrast promotional creative with strong visual hierarchy and clear focal point. Include offer messaging only if quoted exactly, e.g. "20% OFF Today".',
  },
  {
    id: 'mannequin',
    label: 'Mannequin reveal',
    category: 'mannequin',
    defaultAspectRatio: '9:16',
    brief:
      'Static mannequin product reveal setup with clean background and fixed camera. Emphasize consistent framing and product fidelity. If adding copy, keep it short and quote it, e.g. "New drop".',
  },
  {
    id: 'editorial-lifestyle',
    label: 'Editorial lifestyle',
    category: 'beauty',
    defaultAspectRatio: '4:5',
    brief:
      'Premium editorial lifestyle ad with natural environment storytelling, intentional composition, and polished fashion-magazine tone. Keep brand feel elevated and aspirational. Optional copy must be short and quoted, e.g. "Everyday luxury".',
  },
  {
    id: 'expert-talk',
    label: 'Expert talk-to-cam',
    category: 'health',
    defaultAspectRatio: '9:16',
    brief:
      'Creator-style expert explanation with a trustworthy human presence and clear product demo. Keep the framing social-native, benefit-led, and conversion-oriented. If adding text overlays, quote them exactly, e.g. "Clinically inspired routine".',
  },
  {
    id: 'problem-solution',
    label: 'Problem → solution',
    category: 'health',
    defaultAspectRatio: '9:16',
    brief:
      'Before-and-after narrative: clearly show the pain point first, then the product-led improvement. Keep transitions readable and claim-safe. Optional headline must be quoted, e.g. "From chaos to clarity".',
  },
  {
    id: 'macro-proof',
    label: 'Macro proof demo',
    category: 'beauty',
    defaultAspectRatio: '1:1',
    brief:
      'Close-up product proof creative emphasizing texture, ingredients, and mechanism details. Use clean light and controlled highlights for high trust and premium quality. Keep any copy short and quoted, e.g. "See the texture".',
  },
  {
    id: 'benefit-carousel',
    label: 'Benefit stack',
    category: 'supp',
    defaultAspectRatio: '4:5',
    brief:
      'Carousel-friendly benefit stack style: one clear benefit per panel with strong hierarchy and legible spacing. Keep language concise, specific, and direct-response ready. Optional benefit lines must be quoted.',
  },
  {
    id: 'offer-retail',
    label: 'Offer-first retail',
    category: 'supp',
    defaultAspectRatio: '1:1',
    brief:
      'Retail performance ad with offer-forward messaging, urgency cues, and prominent CTA placement while maintaining product clarity. If using discount text, quote it exactly, e.g. "Save 20% today".',
  },
  {
    id: 'testimonial-proof',
    label: 'Testimonial proof',
    category: 'health',
    defaultAspectRatio: '4:5',
    brief:
      'Social proof creative featuring review-style overlays and authentic customer sentiment while keeping the product as focal point. Keep quote text concise and clearly framed in quotes.',
  },
  {
    id: 'comparison',
    label: 'Comparison angle',
    category: 'health',
    defaultAspectRatio: '1:1',
    brief:
      'Side-by-side comparison layout that communicates product differentiation quickly and clearly. Keep claims measured and visual evidence strong. Optional headline must be quoted, e.g. "Why users switch".',
  },
  {
    id: 'seasonal-moment',
    label: 'Seasonal moment',
    category: 'beauty',
    defaultAspectRatio: '4:5',
    brief:
      'Seasonal campaign style tailored to a timely moment (holiday, summer, back-to-school) while preserving core product identity. Use thematic props sparingly and keep CTA copy short and quoted.',
  },
  {
    id: 'cinematic-hero',
    label: 'Cinematic hero',
    category: 'beauty',
    defaultAspectRatio: '16:9',
    brief:
      'Cinematic brand hero creative with dramatic lighting, refined composition, and premium storytelling tone. Keep the product unmistakably clear in-frame and any headline short and quoted, e.g. "Crafted to stand out".',
  },
];

const BRIEF_CHIPS = [
  'Audience: busy professionals',
  'Benefit: saves time',
  'Pain point: messy routine',
  'CTA: "Shop now"',
  'Reveal start: chest center',
  'Motion: roll downward to hem',
  'Lock camera + mannequin + green bg',
  'No logo/text changes',
];

async function bundledAssetToDataUrl(assetUrl: string): Promise<string> {
  const response = await fetch(assetUrl);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read asset'));
    reader.readAsDataURL(blob);
  });
}

function buildTalkShotFramePrompt(
  productName: string,
  brief: string,
  aspectRatio: string,
  shot: NonNullable<ResultSlot['talkShot']>,
): string {
  return `Create a single ${aspectRatio} photorealistic ad frame for ${productName}. This frame is part of an expert talk-to-camera sequence.
Shot objective: ${shot.angle}
On-camera script: ${shot.script}
Framing guidance: ${shot.framing}
B-roll guidance: ${shot.broll}
On-screen text: "${shot.onScreenText}"
Product brief context: ${brief}

HARD PRODUCT RULES:
- Show exactly one unit of ${productName} in frame by default.
- Do not introduce any other product, package, flavor, variant, or category cue.
- Only show multiple units if the brief explicitly requests a specific quantity (e.g., "two bottles", "3-pack").
- Keep logo, label text, and packaging design faithful to the selected product references.

Use premium commercial lighting, natural skin tones, realistic hands/faces, clean product readability, and strong conversion-oriented composition. No extra fingers, no warped text, no watermarks.`;
}

function extractImageList(page: unknown): GeneratedImageData[] {
  if (typeof page !== 'object' || page === null) return [];

  const pageRecord = page as { items?: unknown; data?: unknown };
  if (Array.isArray(pageRecord.items)) {
    return pageRecord.items as GeneratedImageData[];
  }
  if (Array.isArray(pageRecord.data)) {
    return pageRecord.data as GeneratedImageData[];
  }
  return [];
}

export default function CreateAdsPage() {
  const [products, setProducts] = useState<EntityData[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [characters, setCharacters] = useState<EntityData[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [customRefs, setCustomRefs] = useState<CustomAdReferenceData[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [styleLibraryImages, setStyleLibraryImages] = useState<GeneratedImageData[]>([]);
  const [isStyleLibraryLoading, setIsStyleLibraryLoading] = useState(true);
  const [selectedStyleImageUrl, setSelectedStyleImageUrl] = useState<string | null>(null);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  // Wizard state lives in a Zustand store so it (and any in-flight fal
  // generations) survive navigating away from and back to this page.
  const step = useCreateAdsStore((s) => s.step);
  const selectedAdId = useCreateAdsStore((s) => s.selectedAdId);
  const selectedProductId = useCreateAdsStore((s) => s.selectedProductId);
  const productBrief = useCreateAdsStore((s) => s.productBrief);
  const aspectRatio = useCreateAdsStore((s) => s.aspectRatio);
  const results = useCreateAdsStore((s) => s.results);
  const isGenerating = useCreateAdsStore((s) => s.isGenerating);
  const outputMode = useCreateAdsStore((s) => s.outputMode);
  const setStep = useCreateAdsStore((s) => s.setStep);
  const setSelectedAdId = useCreateAdsStore((s) => s.setSelectedAdId);
  const setSelectedProductId = useCreateAdsStore((s) => s.setSelectedProductId);
  const setProductBrief = useCreateAdsStore((s) => s.setProductBrief);
  const setAspectRatio = useCreateAdsStore((s) => s.setAspectRatio);
  const setOutputMode = useCreateAdsStore((s) => s.setOutputMode);
  const removeResultByImageId = useCreateAdsStore((s) => s.removeResultByImageId);
  const startNewAd = useCreateAdsStore((s) => s.startNewAd);
  const runGeneration = useCreateAdsStore((s) => s.runGeneration);
  const retrySlot = useCreateAdsStore((s) => s.retrySlot);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await kingApi.entities.list('products', activeWorkspace.id);
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) toast.error("Couldn't load your products. Please try again.");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await kingApi.entities.list('characters', activeWorkspace.id);
        if (!cancelled) setCharacters(list);
      } catch {
        if (!cancelled) setCharacters([]);
      } finally {
        if (!cancelled) setCharactersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await kingApi.images.list(undefined, 24, activeWorkspace.id);
        if (!cancelled) setStyleLibraryImages(extractImageList(page));
      } catch {
        if (!cancelled) setStyleLibraryImages([]);
      } finally {
        if (!cancelled) setIsStyleLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace.id]);

  // Load user-uploaded ad references on mount. They live in the same
  // carousel as the bundled defaults, prepended newest-first so a fresh
  // upload is the first thing the user sees.
  //
  // A failure here is non-fatal — the bundled defaults still render and
  // the rest of the wizard works fine, so we log to the main-process log
  // instead of toasting. (The classic case is an old main-process build
  // running against newer renderer code during dev: the IPC channel
  // doesn't exist yet, but the page is still usable.)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await kingApi.adReferences.list();
        if (!cancelled) setCustomRefs(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void kingApi.log.error('warn', `adReferences.list failed: ${message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge custom refs (newest-first) with bundled defaults. Defaults keep
  // their hand-curated order so the existing layout still feels intentional.
  const allAds: AdReference[] = useMemo(() => {
    const customSorted = [...customRefs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(customRefToAdReference);
    return [...customSorted, ...AD_REFERENCES];
  }, [customRefs]);

  const selectedAd: AdReference | undefined = useMemo(
    () => allAds.find((a) => a.id === selectedAdId),
    [allAds, selectedAdId],
  );

  const handleUploadCustomAd = useCallback(async (file: File) => {
    if (file.size > MAX_CUSTOM_AD_BYTES) {
      toast.error('That image is too large. Please pick one under 15 MB.');
      return;
    }
    let dims: { width: number; height: number; aspectRatio: string };
    try {
      dims = await readImageDimensions(file);
    } catch {
      toast.error("Couldn't read that image. Try a different file.");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const created = await kingApi.adReferences.create({
        file: { name: file.name, buffer },
        width: dims.width,
        height: dims.height,
        aspectRatio: dims.aspectRatio,
      });
      setCustomRefs((prev) => [created, ...prev]);
      toast.success('Reference added.');
    } catch {
      toast.error("Couldn't save that reference. Please try again.");
    }
  }, []);

  const handleDeleteCustomAd = useCallback(
    async (adRefId: string) => {
      // Custom AdReference ids are prefixed with `custom-` so they can't
      // collide with bundled defaults; the backend record id is the rest.
      const backendId = adRefId.startsWith('custom-') ? adRefId.slice('custom-'.length) : adRefId;
      try {
        const result = await kingApi.adReferences.delete(backendId);
        if (!result.success) {
          toast.error("Couldn't delete that reference. Please try again.");
          return;
        }
        setCustomRefs((prev) => prev.filter((r) => r.id !== backendId));
        if (selectedAdId === adRefId) setSelectedAdId(null);
        toast.success('Reference removed.');
      } catch {
        toast.error("Couldn't delete that reference. Please try again.");
      }
    },
    [selectedAdId, setSelectedAdId],
  );
  const selectedProduct: EntityData | undefined = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );
  const selectedCharacter: EntityData | undefined = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId),
    [characters, selectedCharacterId],
  );

  const applyPreset = useCallback(
    (preset: QuickPreset) => {
      const suggestedAd = allAds.find((ad) => ad.category === preset.category);
      if (suggestedAd) setSelectedAdId(suggestedAd.id);
      setAspectRatio(preset.defaultAspectRatio);
      setProductBrief(preset.brief);
      setActivePresetId(preset.id);
      if (step !== 'ad') setStep('ad');
      toast.success(`${preset.label} preset applied.`);
    },
    [allAds, setAspectRatio, setProductBrief, setSelectedAdId, setStep, step],
  );

  const insertBriefChip = useCallback(
    (chip: string) => {
      const lines = productBrief
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const hasChip = lines.includes(chip);
      const nextLines = hasChip ? lines.filter((line) => line !== chip) : [...lines, chip];
      setProductBrief(nextLines.join('\n'));
    },
    [productBrief, setProductBrief],
  );

  // Per-step validity — controls whether the Next button is enabled.
  const canAdvance: Record<StepId, boolean> = {
    ad: !!selectedAd,
    product: !!selectedProduct,
    brief: productBrief.trim().length > 0,
    format: !!selectedAd && !!selectedProduct && productBrief.trim().length > 0 && !isGenerating,
    results: true,
    animate: false,
  };

  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === step);
  // Back is available on every step except the first. On the results
  // step it doubles as the Cancel action for in-flight generations.
  const canGoBack = step !== 'ad';

  const goNext = useCallback(() => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx < 0 || idx >= WIZARD_STEPS.length - 1) return;
    const next = WIZARD_STEPS[idx + 1];
    if (next) setStep(next.id);
  }, [step, setStep]);

  const goBack = useCallback(() => {
    // On the results step, Back goes back to the format step so the user
    // can adjust and regenerate. In-flight generations are NOT stopped —
    // fal runs server-side and we've already been charged, so we let the
    // request complete and save its output to the gallery in the
    // background.
    if (step === 'results') {
      setStep('format');
      return;
    }
    if (step === 'animate') {
      setStep('results');
      return;
    }
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx <= 0) return;
    const prev = WIZARD_STEPS[idx - 1];
    if (prev) setStep(prev.id);
  }, [step, setStep]);

  // Kick off generation via the store. The store handles all state updates,
  // so if the user navigates away mid-generation the results still stream
  // in and are visible when they return.
  const handleGenerate = useCallback(() => {
    if (!selectedAd || !selectedProduct) return;
    setCompareIds([]);

    let adForRun: AdReference = selectedAd;
    if (selectedStyleImageUrl) {
      const styleVariant: AdVariant = { aspectRatio, imageUrl: selectedStyleImageUrl };
      adForRun = {
        id: `library-style-${Date.now()}`,
        category: 'custom',
        variants: [styleVariant],
      };
    }

    const characterReferenceUrls = selectedCharacter?.referenceImages.slice(0, 2) ?? [];
    void runGeneration(adForRun, selectedProduct, outputMode, characterReferenceUrls);
  }, [
    selectedAd,
    selectedProduct,
    runGeneration,
    selectedStyleImageUrl,
    aspectRatio,
    selectedCharacter,
  ]);

  // Download a generated ad to the user's filesystem — same mechanism the
  // Image page uses so the two flows stay consistent.
  const handleDownload = useCallback(async (url: string, prompt: string) => {
    const filename = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
    try {
      const result = await kingApi.files.download(url, filename);
      if (result.success) {
        toast.success('Image saved.');
      } else if (!result.cancelled) {
        toast.error("Couldn't save the image. Please try again.");
      }
    } catch {
      toast.error("Couldn't save the image. Please try again.");
    }
  }, []);

  // Delete a generated ad from the app gallery and drop it from the
  // results grid so the UI stays in sync.
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const result = await kingApi.images.delete(id);
        if (result.success) {
          removeResultByImageId(id);
          toast.success('Image deleted.');
        } else {
          toast.error("Couldn't delete the image. Please try again.");
        }
      } catch {
        toast.error("Couldn't delete the image. Please try again.");
      }
    },
    [removeResultByImageId],
  );

  // Current step's title (the Results step isn't in WIZARD_STEPS but needs one).
  // Fall back to the first step if the index lookup fails so the header still
  // renders instead of crashing during a bad state.
  // WIZARD_STEPS is a hardcoded non-empty array; the `!` codifies that so
  // activeStep is never `undefined` under noUncheckedIndexedAccess.
  const activeStep =
    step === 'results'
      ? { id: 'results' as const, label: 'Results', title: 'Your ads', hint: undefined }
      : (WIZARD_STEPS[currentIndex] ?? WIZARD_STEPS[0]!);

  return (
    <main className="flex flex-1 justify-center overflow-y-auto">
      <div className="flex min-h-full w-full max-w-5xl items-center px-6 py-8 md:px-10">
        <div className="flex w-full flex-col gap-6">
          {/* Progress indicator — kept at the narrower wizard width so it
              stays visually anchored in the centre even when the body step
              (e.g. the ad carousel) uses the full container width. */}
          <div className="mx-auto w-full max-w-3xl">
            <WizardProgress currentStep={step} />
          </div>

          {/* Quick presets keep first-time setup fast without changing the flow. */}
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
            {QUICK_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                    isActive
                      ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                      : 'border-[var(--base-color-brand--umber)]/45 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)] hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)]'
                  }`}
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Step title — fixed min-height so the footer doesn't shift when
              the hint line appears only on some steps. */}
          <div className="mx-auto flex min-h-[112px] w-full max-w-3xl flex-col gap-2 text-center">
            <h2
              className="text-3xl font-bold tracking-tight text-[var(--base-color-brand--bean)] sm:text-4xl"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              {activeStep.title}
            </h2>
            {activeStep.id !== 'results' &&
              WIZARD_STEPS.find((s) => s.id === activeStep.id)?.hint && (
                <p className="mx-auto max-w-xl text-sm text-[var(--base-color-brand--umber)]">
                  {WIZARD_STEPS.find((s) => s.id === activeStep.id)?.hint}
                </p>
              )}
          </div>

          {/* Step body — fixed 360px on every step (including results) so
              the progress indicator, title, and Back/Next buttons stay in
              identical positions across the whole flow. Tall content
              (portrait result cards, long product lists) scrolls internally
              within the box. Click any result card to open the full-size
              detail overlay.

              The ad carousel and the results grid get the full container
              width so all thumbnails / all 4 generations fit on one row;
              every other step stays at the narrower wizard width. */}
          <div
            key={step}
            className={`animate-step-in hide-scrollbar h-[360px] overflow-y-auto ${
              step === 'ad' || step === 'results' ? 'w-full' : 'mx-auto w-full max-w-3xl'
            }`}
          >
            {step === 'ad' && (
              <AdStyleStep
                ads={allAds}
                selectedAdId={selectedAdId}
                onSelect={setSelectedAdId}
                onUpload={handleUploadCustomAd}
                onDeleteCustom={handleDeleteCustomAd}
              />
            )}
            {step === 'product' && (
              <ProductStep
                products={products}
                isLoading={productsLoading}
                selectedProductId={selectedProductId}
                onSelect={setSelectedProductId}
              />
            )}
            {step === 'brief' && (
              <BriefStep
                value={productBrief}
                onChange={setProductBrief}
                onInsertChip={insertBriefChip}
                styleLibraryImages={styleLibraryImages}
                isStyleLibraryLoading={isStyleLibraryLoading}
                selectedStyleImageUrl={selectedStyleImageUrl}
                onSelectStyleImage={setSelectedStyleImageUrl}
                characters={characters}
                charactersLoading={charactersLoading}
                selectedCharacterId={selectedCharacterId}
                onSelectCharacter={setSelectedCharacterId}
              />
            )}
            {step === 'format' && (
              <FormatStep
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                selectedAd={selectedAd}
                outputMode={outputMode}
                onOutputModeChange={setOutputMode}
              />
            )}
            {step === 'results' && (
              <ResultsStep
                results={results}
                aspectRatio={aspectRatio}
                outputMode={outputMode}
                selectedAd={selectedAd}
                selectedProduct={selectedProduct}
                selectedCharacter={selectedCharacter}
                productBrief={productBrief}
                selectedStyleImageUrl={selectedStyleImageUrl}
                onOpen={setSelectedImage}
                onRetry={retrySlot}
                compareIds={compareIds}
                onToggleCompare={(id) =>
                  setCompareIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((x) => x !== id)
                      : prev.length < 2
                        ? [...prev, id]
                        : prev,
                  )
                }
                workspaceId={activeWorkspace.id}
              />
            )}
            {step === 'animate' && (
              <AnimateStep
                selectedProduct={selectedProduct}
                selectedAd={selectedAd}
                productBrief={productBrief}
                aspectRatio={aspectRatio}
                results={results}
              />
            )}
          </div>

          {/* Footer nav — pinned to the narrow wizard width so the
              Back/Next buttons stay in the same place across every step. */}
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)] disabled:cursor-not-allowed disabled:opacity-0"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              Back
            </button>

            {step === 'results' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('animate')}
                  disabled={
                    results.filter((r) => r.status === 'success').length === 0 || isGenerating
                  }
                  className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  Animate
                </button>
                <button
                  type="button"
                  onClick={startNewAd}
                  disabled={isGenerating}
                  className="inline-grid h-[52px] grid-flow-col items-center justify-center gap-2 rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-6 text-sm font-semibold tracking-wide text-[var(--base-color-brand--shell)] shadow-[0_4px_0_0_var(--base-color-brand--dark-red)] transition-all duration-150 hover:bg-[var(--base-color-brand--red)] focus:outline-none active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--base-color-brand--dark-red)] disabled:cursor-not-allowed disabled:bg-[var(--base-color-brand--umber)] disabled:text-[var(--base-color-brand--shell)]/70 disabled:shadow-[0_4px_0_0_var(--base-color-brand--bean)]"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  Create another
                </button>
              </div>
            ) : step === 'format' ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canAdvance.format}
                className="inline-grid h-[52px] grid-flow-col items-center justify-center gap-2 rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-6 text-sm font-semibold tracking-wide text-[var(--base-color-brand--shell)] shadow-[0_4px_0_0_var(--base-color-brand--dark-red)] transition-all duration-150 hover:bg-[var(--base-color-brand--red)] focus:outline-none active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--base-color-brand--dark-red)] disabled:cursor-not-allowed disabled:bg-[var(--base-color-brand--umber)] disabled:text-[var(--base-color-brand--shell)]/70 disabled:shadow-[0_4px_0_0_var(--base-color-brand--bean)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                <span>Generate</span>
                <SparkleIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance[step]}
                className="inline-grid h-[52px] grid-flow-col items-center justify-center gap-2 rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-6 text-sm font-semibold tracking-wide text-[var(--base-color-brand--shell)] shadow-[0_4px_0_0_var(--base-color-brand--dark-red)] transition-all duration-150 hover:bg-[var(--base-color-brand--red)] focus:outline-none active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--base-color-brand--dark-red)] disabled:cursor-not-allowed disabled:bg-[var(--base-color-brand--umber)] disabled:text-[var(--base-color-brand--shell)]/70 disabled:shadow-[0_4px_0_0_var(--base-color-brand--bean)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen detail overlay for previewing, downloading, or deleting
          a generated ad — same component the Image page uses. */}
      {selectedImage && (
        <ImageDetailOverlay
          image={selectedImage}
          images={results
            .filter((slot) => slot.status === 'success' && slot.image)
            .map((slot) => slot.image as GeneratedImage)}
          onClose={() => setSelectedImage(null)}
          onDownload={handleDownload}
          onDelete={(id) => {
            handleDelete(id);
            setSelectedImage(null);
          }}
          // Recreate isn't meaningful here — the user is already inside the
          // ad wizard with their inputs. Provide a no-op so the shared panel
          // component's button stays wired without sending them elsewhere.
          onRecreate={() => {}}
        />
      )}
    </main>
  );
}

// --- Progress indicator ---------------------------------------------------

function WizardProgress({ currentStep }: { currentStep: StepId }) {
  const currentIdx =
    currentStep === 'results'
      ? WIZARD_STEPS.length
      : WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2">
      {WIZARD_STEPS.map((s, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                done || active
                  ? 'bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                  : 'border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--umber)]'
              }`}
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              {done ? <CheckIcon /> : idx + 1}
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded-full transition-colors ${
                  idx < currentIdx
                    ? 'bg-[var(--base-color-brand--bean)]'
                    : 'bg-[var(--base-color-brand--umber)]/30'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Step: Ad style -------------------------------------------------------

function AdStyleStep({
  ads,
  selectedAdId,
  onSelect,
  onUpload,
  onDeleteCustom,
}: {
  ads: AdReference[];
  selectedAdId: string | null;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void | Promise<void>;
  onDeleteCustom: (id: string) => void | Promise<void>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll by roughly one card-and-a-bit per click so multiple presses walk
  // cleanly through the carousel.
  const scrollBy = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset value immediately so picking the same file twice in a row
      // still fires `change`.
      e.target.value = '';
      if (file) void onUpload(file);
    },
    [onUpload],
  );

  const handleWheelScroll = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = horizontalIntent ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    e.preventDefault();
    el.scrollLeft += delta;
  }, []);

  return (
    <div className="flex items-center gap-3">
      <CarouselScrollButton direction="left" onClick={() => scrollBy(-1)} />
      <div
        ref={scrollerRef}
        className="hide-scrollbar min-w-0 flex-1 overflow-x-auto"
        onWheel={handleWheelScroll}
      >
        <div className="flex gap-4 pb-2">
          {/* Upload tile — always first so the action is discoverable
              regardless of how many ads are in the carousel. */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex h-64 w-44 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--shell)] sm:h-72"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)] transition-transform group-hover:scale-105">
              <PlusIcon />
            </span>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              Add reference
            </span>
            <span className="px-3 text-center text-[11px] text-[var(--base-color-brand--umber)]">
              PNG, JPG, WebP, HEIC
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={CUSTOM_AD_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          {ads.map((ad) => {
            const active = selectedAdId === ad.id;
            const categoryLabel = AD_CATEGORY_LABELS[ad.category];
            return (
              <div
                key={ad.id}
                className={`group relative h-64 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--base-color-brand--shell)] transition-all sm:h-72 ${
                  active
                    ? 'border-[var(--base-color-brand--bean)] shadow-[0_8px_24px_-12px_rgba(51,32,26,0.35)]'
                    : 'border-transparent hover:border-[var(--base-color-brand--umber)]/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(ad.id)}
                  title={categoryLabel}
                  className="block h-full w-full cursor-pointer"
                >
                  <img
                    src={getThumbnail(ad)}
                    alt={categoryLabel}
                    className="block h-full w-auto transition-transform group-hover:scale-[1.03]"
                  />
                </button>
                <div className="pointer-events-none absolute top-2 left-2 z-20">
                  <Badge>{categoryLabel}</Badge>
                </div>
                {active && (
                  <div className="pointer-events-none absolute top-2 right-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]">
                    <CheckIcon />
                  </div>
                )}
                {/* Delete affordance — custom refs only. Mirrors the Image
                    page pattern: hover-revealed pill in the corner with a
                    destructive hover state. Sits below the active checkmark
                    so both can coexist when a custom ad is also selected. */}
                {ad.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDeleteCustom(ad.id);
                    }}
                    title="Delete reference"
                    aria-label="Delete reference"
                    className={`absolute z-30 grid h-8 w-8 place-items-center rounded-full bg-[var(--base-color-brand--bean)]/80 text-[var(--base-color-brand--shell)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-[var(--base-color-brand--dark-red)] ${
                      active ? 'top-11 right-2' : 'top-2 right-2'
                    }`}
                  >
                    <DeleteIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <CarouselScrollButton direction="right" onClick={() => scrollBy(1)} />
    </div>
  );
}

function CarouselScrollButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)] shadow-[0_4px_12px_-4px_rgba(51,32,26,0.35)] transition-colors hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)]"
    >
      {direction === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}

// --- Step: Product --------------------------------------------------------

function ProductStep({
  products,
  isLoading,
  selectedProductId,
  onSelect,
}: {
  products: EntityData[];
  isLoading: boolean;
  selectedProductId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-8 text-sm text-[var(--base-color-brand--umber)]">
        <div className="size-4 animate-spin rounded-full border-2 border-[var(--base-color-brand--umber)]/30 border-t-[var(--base-color-brand--bean)]" />
        Loading products...
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] p-8 text-center">
        <p className="text-sm text-[var(--base-color-brand--umber)]">
          No products yet. Add a product on the Products page to get started.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => {
        const active = selectedProductId === product.id;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product.id)}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-[var(--base-color-brand--champagne)] text-left transition-all ${
              active
                ? 'border-[var(--base-color-brand--bean)] shadow-[0_8px_24px_-12px_rgba(51,32,26,0.35)]'
                : 'border-transparent hover:border-[var(--base-color-brand--umber)]/40'
            }`}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--base-color-brand--shell)]">
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.name}
                  className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid size-full place-items-center text-xs text-[var(--base-color-brand--umber)]">
                  No image
                </div>
              )}
              {active && (
                <div className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]">
                  <CheckIcon />
                </div>
              )}
            </div>
            <div className="p-3">
              <span
                className="block truncate text-sm font-bold tracking-tight text-[var(--base-color-brand--bean)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                title={product.name}
              >
                {product.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// --- Step: Brief ----------------------------------------------------------

function BriefStep({
  value,
  onChange,
  onInsertChip,
  styleLibraryImages,
  isStyleLibraryLoading,
  selectedStyleImageUrl,
  onSelectStyleImage,
  characters,
  charactersLoading,
  selectedCharacterId,
  onSelectCharacter,
}: {
  value: string;
  onChange: (v: string) => void;
  onInsertChip: (chip: string) => void;
  styleLibraryImages: GeneratedImageData[];
  isStyleLibraryLoading: boolean;
  selectedStyleImageUrl: string | null;
  onSelectStyleImage: (url: string | null) => void;
  characters: EntityData[];
  charactersLoading: boolean;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {BRIEF_CHIPS.map((chip) => {
          const selected = value
            .split('\n')
            .map((line) => line.trim())
            .includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onInsertChip(chip)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                selected
                  ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                  : 'border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)] hover:border-[var(--base-color-brand--bean)]'
              }`}
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              {selected ? '✓ ' : '+ '}
              {chip}
            </button>
          );
        })}
      </div>
      <div className="space-y-2 rounded-2xl border border-[var(--base-color-brand--umber)]/35 bg-[var(--base-color-brand--shell)] p-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
            Add character reference (optional)
          </p>
          {charactersLoading ? (
            <p className="text-[11px] text-[var(--base-color-brand--umber)]">Loading characters…</p>
          ) : characters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectCharacter(null)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedCharacterId === null
                    ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                    : 'border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
                }`}
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                None
              </button>
              {characters.map((character) => {
                const active = selectedCharacterId === character.id;
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => onSelectCharacter(character.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      active
                        ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                        : 'border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
                    }`}
                    style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                    title={character.name}
                  >
                    {character.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--base-color-brand--umber)]">
              No character entities found yet.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
            Optional: use Image tab base image as style source
          </p>
          {selectedStyleImageUrl && (
            <button
              type="button"
              onClick={() => onSelectStyleImage(null)}
              className="text-[11px] font-semibold text-[var(--base-color-brand--umber)] hover:text-[var(--base-color-brand--bean)]"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              Clear
            </button>
          )}
        </div>
        {isStyleLibraryLoading ? (
          <p className="text-[11px] text-[var(--base-color-brand--umber)]">Loading images…</p>
        ) : styleLibraryImages.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {styleLibraryImages.map((img) => {
              const active = selectedStyleImageUrl === img.url;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onSelectStyleImage(img.url)}
                  className={`overflow-hidden rounded-xl border-2 ${
                    active
                      ? 'border-[var(--base-color-brand--bean)]'
                      : 'border-[var(--base-color-brand--umber)]/35'
                  }`}
                  title={img.prompt}
                >
                  <img
                    src={img.thumbnailUrl ?? img.url}
                    alt="Style source"
                    className="h-16 w-12 object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--base-color-brand--umber)]">
            No images found in Image tab yet.
          </p>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. A double-walled stainless steel coffee mug that keeps drinks hot for 6 hours. Leak-proof lid, minimalist design, aimed at remote workers."
        autoFocus
        className="min-h-[180px] w-full resize-y rounded-2xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--champagne)] p-4 text-[15px] text-[var(--text-color--text-primary)] placeholder:text-[var(--base-color-brand--umber)]/60 focus:border-[var(--base-color-brand--bean)] focus:outline-none"
      />
    </div>
  );
}

// --- Step: Format ---------------------------------------------------------

function FormatStep({
  aspectRatio,
  onAspectRatioChange,
  selectedAd,
  outputMode,
  onOutputModeChange,
}: {
  aspectRatio: string;
  onAspectRatioChange: (v: string) => void;
  selectedAd?: AdReference | undefined;
  outputMode: CreateAdsOutputMode;
  onOutputModeChange: (mode: CreateAdsOutputMode) => void;
}) {
  const suggestedRatio = selectedAd?.variants?.[0]?.aspectRatio;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOutputModeChange('still-batch')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            outputMode === 'still-batch'
              ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
              : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
          }`}
          style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
        >
          Still Batch (4 images)
        </button>
        <button
          type="button"
          onClick={() => onOutputModeChange('talk-to-cam')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            outputMode === 'talk-to-cam'
              ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
              : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
          }`}
          style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
        >
          Talk-to-Cam Shot Plan
        </button>
      </div>
      {suggestedRatio && suggestedRatio !== aspectRatio && (
        <button
          type="button"
          onClick={() => onAspectRatioChange(suggestedRatio)}
          className="rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--bean)]"
          style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
        >
          Suggested for this style: {suggestedRatio}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AD_ASPECT_RATIOS.map((ratio) => {
          const active = aspectRatio === ratio.value;
          return (
            <button
              key={ratio.value}
              type="button"
              onClick={() => onAspectRatioChange(ratio.value)}
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-[var(--base-color-brand--champagne)] p-4 transition-all ${
                active
                  ? 'border-[var(--base-color-brand--bean)] shadow-[0_8px_24px_-12px_rgba(51,32,26,0.35)]'
                  : 'border-transparent hover:border-[var(--base-color-brand--umber)]/40'
              }`}
            >
              <div className="grid h-[60px] w-full place-items-center">
                <div
                  className={`rounded-md border-2 transition-colors ${
                    active
                      ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)]/10'
                      : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)]'
                  }`}
                  style={{ width: ratio.width, height: ratio.height }}
                />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-sm font-bold tracking-tight text-[var(--base-color-brand--bean)]"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  {ratio.label}
                </span>
                <span className="text-[11px] text-[var(--base-color-brand--umber)]">
                  {ratio.description}
                </span>
              </div>
              {active && (
                <div className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]">
                  <CheckIcon />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Step: Results --------------------------------------------------------

function ResultsStep({
  results,
  aspectRatio,
  outputMode,
  selectedAd,
  selectedProduct,
  selectedCharacter,
  productBrief,
  selectedStyleImageUrl,
  onOpen,
  onRetry,
  compareIds,
  onToggleCompare,
  // #region agent log
  workspaceId,
  // #endregion
}: {
  results: ResultSlot[];
  aspectRatio: string;
  outputMode: CreateAdsOutputMode;
  selectedAd?: AdReference | undefined;
  selectedProduct?: EntityData | undefined;
  selectedCharacter?: EntityData | undefined;
  productBrief: string;
  selectedStyleImageUrl: string | null;
  onOpen: (image: GeneratedImage) => void;
  onRetry: (slotId: string) => void;
  compareIds: string[];
  onToggleCompare: (slotId: string) => void;
  workspaceId: string;
}) {
  const [editableShots, setEditableShots] = useState<NonNullable<ResultSlot['talkShot']>[]>([]);
  const [isGeneratingAdSet, setIsGeneratingAdSet] = useState(false);

  useEffect(() => {
    setEditableShots(
      results
        .map((slot) => slot.talkShot)
        .filter((shot): shot is NonNullable<ResultSlot['talkShot']> => !!shot),
    );
  }, [results]);

  const generateCompleteAdSet = async () => {
    if (!selectedAd || !selectedProduct) {
      toast.error('Pick an ad style and product first.');
      return;
    }
    if (editableShots.length === 0) {
      toast.error('No shot plan available.');
      return;
    }

    setIsGeneratingAdSet(true);
    try {
      const variant = pickVariant(selectedAd, aspectRatio);
      let adReferenceUrl = variant.imageUrl;
      if (!adReferenceUrl.startsWith('local-file://') && !adReferenceUrl.startsWith('http')) {
        adReferenceUrl = await bundledAssetToDataUrl(adReferenceUrl);
      }
      const productUrls = selectedProduct.referenceImages.slice(0, 4);
      const characterUrls = selectedCharacter?.referenceImages.slice(0, 2) ?? [];

      let createdCount = 0;
      for (const shot of editableShots) {
        const prompt = buildTalkShotFramePrompt(
          selectedProduct.name,
          productBrief,
          aspectRatio,
          shot,
        );
        const result = await kingApi.generate.image({
          prompt,
          aspectRatio,
          resolution: '2K',
          outputFormat: 'png',
          imageUrls: [
            ...(selectedStyleImageUrl ? [selectedStyleImageUrl] : [adReferenceUrl]),
            ...productUrls,
            ...characterUrls,
          ],
        });
        const firstUrl = result.success ? result.resultUrls?.[0] : undefined;
        if (!firstUrl) continue;

        const saved = await kingApi.images.save({
          url: firstUrl,
          prompt,
          aspectRatio,
          workspaceId,
        });
        useImagesStore.getState().addImage(saved);
        createdCount += 1;
      }

      if (createdCount === 0) toast.error('No frames were generated.');
      else
        toast.success(`Generated ${createdCount} talk-to-cam frame${createdCount > 1 ? 's' : ''}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate complete ad set.';
      toast.error(message);
    } finally {
      setIsGeneratingAdSet(false);
    }
  };

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-[var(--base-color-brand--umber)]">
        No results yet.
      </div>
    );
  }
  if (outputMode === 'talk-to-cam') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border-2 border-[var(--base-color-brand--cinamon)] bg-[var(--base-color-brand--champagne)] p-3">
          <p
            className="text-center text-xs font-semibold text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Structured talking-head sequence for script + shot execution.
          </p>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => void generateCompleteAdSet()}
              disabled={isGeneratingAdSet}
              className="inline-grid h-10 grid-flow-col items-center justify-center rounded-full bg-[var(--base-color-brand--cinamon)] px-4 text-xs font-semibold text-[var(--base-color-brand--shell)] disabled:opacity-60"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              {isGeneratingAdSet ? 'Generating complete ad set…' : 'Generate complete ad set'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {results.map((slot) => {
            if (slot.status !== 'success' || !slot.talkShot) {
              return (
                <div
                  key={slot.id}
                  className="rounded-2xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--champagne)] p-4 text-xs text-[var(--base-color-brand--umber)]"
                >
                  {slot.status === 'pending'
                    ? 'Generating shot plan…'
                    : (slot.error ?? 'Shot plan unavailable.')}
                </div>
              );
            }
            const shot = slot.talkShot;
            return (
              <div
                key={slot.id}
                className="space-y-2 rounded-2xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] p-4"
              >
                <p className="text-xs font-bold tracking-wide text-[var(--base-color-brand--bean)]">
                  {shot.angle}
                </p>
                <p className="text-xs text-[var(--base-color-brand--bean)]">
                  <span className="font-semibold">Script:</span> {shot.script}
                </p>
                <p className="text-xs text-[var(--base-color-brand--bean)]">
                  <span className="font-semibold">Framing:</span> {shot.framing}
                </p>
                <p className="text-xs text-[var(--base-color-brand--bean)]">
                  <span className="font-semibold">B-roll:</span> {shot.broll}
                </p>
                <p className="text-xs text-[var(--base-color-brand--bean)]">
                  <span className="font-semibold">On-screen text:</span> {shot.onScreenText}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // All 4 generations side-by-side on one row so the user can compare them
  // at a glance. Uses the same wider container width as the ad carousel.
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-[var(--base-color-brand--umber)]">
        Select up to 2 results to compare.
      </p>
      <div className="grid grid-cols-4 gap-4">
        {results.map((slot) => (
          <ResultCard
            key={slot.id}
            slot={slot}
            aspectRatio={aspectRatio}
            onOpen={onOpen}
            onRetry={onRetry}
            compareSelected={compareIds.includes(slot.id)}
            onToggleCompare={onToggleCompare}
          />
        ))}
      </div>
    </div>
  );
}

function AnimateStep({
  selectedProduct,
  selectedAd,
  productBrief,
  aspectRatio,
  results,
}: {
  selectedProduct?: EntityData | undefined;
  selectedAd?: AdReference | undefined;
  productBrief: string;
  aspectRatio: string;
  results: ResultSlot[];
}) {
  const style = AD_CATEGORY_LABELS[selectedAd?.category ?? 'custom'];
  const productName = selectedProduct?.name ?? 'the product';

  const shirtUnwrapPrompt = `Static camera, studio mannequin torso centered. Two realistic human hands slowly unwrap and unfold ${productName} on the mannequin, revealing a clean front view. Keep natural cloth physics, soft commercial lighting, and premium ecommerce styling inspired by ${style}. No face, no warped logos, no extra fingers, no camera motion. Duration 5 seconds. Output ${aspectRatio}.`;

  const revealPrompt = `Locked-off camera. Start with ${productName} partially obscured, then hands reveal it smoothly in one continuous motion. Preserve product identity, label readability, and stitching details. Match ${style} ad quality with natural shadows and controlled highlights. No jitter, no frame warping, no extra limbs. Output ${aspectRatio}, 5-7 seconds.`;

  const [selectedSourceImageUrl, setSelectedSourceImageUrl] = useState<string | null>(null);
  const [pinnedSourceImageUrl, setPinnedSourceImageUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState(shirtUnwrapPrompt);
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [libraryImages, setLibraryImages] = useState<GeneratedImageData[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [isMotionPackOpen, setIsMotionPackOpen] = useState(false);
  const [useMultiShotGuidance, setUseMultiShotGuidance] = useState(false);
  const [shot1Prompt, setShot1Prompt] = useState(
    `Shot 1: Lock camera on mannequin chest center with green background; ${productName} enters frame with natural hand movement and no logo distortion.`,
  );
  const [shot2Prompt, setShot2Prompt] = useState(
    'Shot 2: Controlled reveal begins from chest center and slowly unfolds downward, preserving garment shape, stitching, and print accuracy.',
  );
  const [shot3Prompt, setShot3Prompt] = useState(
    `Shot 3: Complete downward roll to hem and hold final front-facing frame with clean ecommerce lighting in ${style} quality.`,
  );

  const successfulImages = results
    .filter((slot) => slot.status === 'success' && slot.image)
    .map((slot) => slot.image!);

  const sourceImageUrl =
    pinnedSourceImageUrl ?? selectedSourceImageUrl ?? successfulImages[0]?.url ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await kingApi.images.list(undefined, 24);
        if (!cancelled) setLibraryImages(extractImageList(page));
      } catch {
        if (!cancelled) setLibraryImages([]);
      } finally {
        if (!cancelled) setIsLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pinnedSourceImageUrl && !selectedSourceImageUrl && successfulImages[0]?.url) {
      setSelectedSourceImageUrl(successfulImages[0].url);
    }
  }, [pinnedSourceImageUrl, selectedSourceImageUrl, successfulImages]);

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Prompt copied.');
    } catch {
      toast.error("Couldn't copy prompt.");
    }
  };

  const handleGenerateVideo = async () => {
    if (!sourceImageUrl) {
      toast.error('Generate at least one image first, then select it as video source.');
      return;
    }
    if (!videoPrompt.trim()) {
      toast.error('Add a video prompt first.');
      return;
    }

    if (typeof kingApi.generate.video !== 'function') {
      toast.error(
        'Video generation is not loaded in this session. Please restart the app and try again.',
      );
      return;
    }

    setIsGeneratingVideo(true);
    setVideoUrl(null);
    try {
      const result = await kingApi.generate.video({
        prompt: videoPrompt.trim(),
        imageUrl: sourceImageUrl,
        aspectRatio,
        durationSeconds: videoDuration,
      });
      setVideoUrl(result.videoUrl);
      toast.success('Video generated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate video.";
      if (/No handler registered for 'generate:video'/.test(message)) {
        toast.error('Video engine update detected. Restart the app, then run Animate again.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl) return;
    const filename = `create_ads_video_${Date.now()}.mp4`;
    try {
      const result = await kingApi.files.download(videoUrl, filename);
      if (result.success) toast.success('Video saved.');
      else if (!result.cancelled) toast.error("Couldn't save video.");
    } catch {
      toast.error("Couldn't save video.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--base-color-brand--umber)]/35 bg-[var(--base-color-brand--champagne)] p-4">
      <h3
        className="text-lg font-bold text-[var(--base-color-brand--bean)]"
        style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
      >
        Video prompt pack: Shirt unwrap
      </h3>
      <p className="text-xs text-[var(--base-color-brand--umber)]">
        Generate video directly in-app from a successful Create Ads result.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
            1) Pick source image
          </p>
          {sourceImageUrl && (
            <button
              type="button"
              onClick={() =>
                setPinnedSourceImageUrl((prev) => (prev === sourceImageUrl ? null : sourceImageUrl))
              }
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                pinnedSourceImageUrl === sourceImageUrl
                  ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                  : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
              }`}
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              {pinnedSourceImageUrl === sourceImageUrl
                ? 'Pinned source image'
                : 'Pin source image for session'}
            </button>
          )}
        </div>

        {successfulImages.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-[var(--base-color-brand--umber)]">
              From this Create Ads run
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {successfulImages.map((img) => {
                const active = sourceImageUrl === img.url;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      setSelectedSourceImageUrl(img.url);
                    }}
                    className={`overflow-hidden rounded-xl border-2 ${
                      active
                        ? 'border-[var(--base-color-brand--bean)]'
                        : 'border-[var(--base-color-brand--umber)]/35'
                    }`}
                  >
                    <img src={img.url} alt="Source" className="h-20 w-16 object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-[11px] text-[var(--base-color-brand--umber)]">From Image library</p>
          {isLibraryLoading ? (
            <p className="text-[11px] text-[var(--base-color-brand--umber)]">
              Loading library images…
            </p>
          ) : libraryImages.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {libraryImages.map((img) => {
                const active = sourceImageUrl === img.url;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      setSelectedSourceImageUrl(img.url);
                    }}
                    className={`overflow-hidden rounded-xl border-2 ${
                      active
                        ? 'border-[var(--base-color-brand--bean)]'
                        : 'border-[var(--base-color-brand--umber)]/35'
                    }`}
                    title={img.prompt}
                  >
                    <img
                      src={img.thumbnailUrl ?? img.url}
                      alt="Library source"
                      className="h-20 w-16 object-cover"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--base-color-brand--umber)]">
              No image-library items found yet.
            </p>
          )}
        </div>

        {successfulImages.length === 0 && libraryImages.length === 0 && !isLibraryLoading && (
          <p className="text-xs text-[var(--base-color-brand--umber)]">
            No source images yet. Generate on Image page or Create Ads Results first.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
          2) Choose prompt preset
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVideoPrompt(shirtUnwrapPrompt)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Use Prompt A
          </button>
          <button
            type="button"
            onClick={() => setVideoPrompt(revealPrompt)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Use Prompt B
          </button>
          <button
            type="button"
            onClick={() => void copyPrompt(videoPrompt)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Copy current prompt
          </button>
        </div>

        <details
          open={isMotionPackOpen}
          onToggle={(e) => setIsMotionPackOpen((e.target as HTMLDetailsElement).open)}
          className="rounded-xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] p-3"
        >
          <summary
            className="cursor-pointer text-xs font-semibold text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Advanced Motion Pack (beta)
          </summary>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-[var(--base-color-brand--bean)]">
              <input
                type="checkbox"
                checked={useMultiShotGuidance}
                onChange={(e) => setUseMultiShotGuidance(e.target.checked)}
              />
              Use multi-shot reveal guidance (beta)
            </label>
            {useMultiShotGuidance && (
              <div className="space-y-2">
                <textarea
                  value={shot1Prompt}
                  onChange={(e) => setShot1Prompt(e.target.value)}
                  className="min-h-16 w-full resize-y rounded-lg border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--champagne)] p-2 text-xs"
                />
                <textarea
                  value={shot2Prompt}
                  onChange={(e) => setShot2Prompt(e.target.value)}
                  className="min-h-16 w-full resize-y rounded-lg border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--champagne)] p-2 text-xs"
                />
                <textarea
                  value={shot3Prompt}
                  onChange={(e) => setShot3Prompt(e.target.value)}
                  className="min-h-16 w-full resize-y rounded-lg border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--champagne)] p-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setVideoPrompt(
                      [shot1Prompt.trim(), shot2Prompt.trim(), shot3Prompt.trim()]
                        .filter((part) => part.length > 0)
                        .join('\n'),
                    )
                  }
                  className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--base-color-brand--bean)]"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  Compose Combined Prompt
                </button>
              </div>
            )}
          </div>
        </details>

        <textarea
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          className="min-h-24 w-full resize-y rounded-xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] p-3 text-xs leading-relaxed text-[var(--text-color--text-primary)] focus:border-[var(--base-color-brand--bean)] focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
          3) Duration and generate
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVideoDuration(5)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              videoDuration === 5
                ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
            }`}
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            5s
          </button>
          <button
            type="button"
            onClick={() => setVideoDuration(10)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              videoDuration === 10
                ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                : 'border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
            }`}
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            10s
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateVideo()}
            disabled={isGeneratingVideo || !sourceImageUrl}
            className="btn-cinamon btn-sm disabled:opacity-60"
          >
            {isGeneratingVideo ? 'Generating video…' : 'Generate Video'}
          </button>
          {videoUrl && (
            <button
              type="button"
              onClick={() => void handleDownloadVideo()}
              className="btn-shell btn-sm"
            >
              Download Video
            </button>
          )}
        </div>
      </div>

      {videoUrl && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--base-color-brand--bean)]">
            Generated preview
          </p>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl border border-[var(--base-color-brand--umber)]/30"
          />
        </div>
      )}

      {productBrief.trim() && (
        <p className="text-xs text-[var(--base-color-brand--umber)]">
          Brief context included: “{productBrief.trim().slice(0, 140)}
          {productBrief.trim().length > 140 ? '…' : ''}”
        </p>
      )}
    </div>
  );
}

function ResultCard({
  slot,
  aspectRatio,
  onOpen,
  onRetry,
  compareSelected,
  onToggleCompare,
}: {
  slot: ResultSlot;
  aspectRatio: string;
  onOpen: (image: GeneratedImage) => void;
  onRetry: (slotId: string) => void;
  compareSelected: boolean;
  onToggleCompare: (slotId: string) => void;
}) {
  const [w, h] = aspectRatio.split(':').map(Number);
  const aspectStyle =
    w !== undefined && h !== undefined && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
      ? { aspectRatio: `${w} / ${h}` }
      : { aspectRatio: '1 / 1' };

  const cardClass =
    'relative w-full overflow-hidden rounded-2xl border border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--champagne)]';

  // Error state — shows the failure reason and a "Try again" button that
  // re-runs just this one slot without touching the successful ones.
  if (slot.status === 'error') {
    return (
      <div className={cardClass} style={aspectStyle}>
        <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-xs leading-snug text-[var(--base-color-brand--umber)]">
            {slot.error ?? "Couldn't generate this one."}
          </p>
          <button
            type="button"
            onClick={() => onRetry(slot.id)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-4 py-1.5 text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--bean)] hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Pending skeleton — plain div, nothing to click.
  if (slot.status === 'pending') {
    return (
      <div className={cardClass} style={aspectStyle}>
        <div className="skeleton-loader size-full" />
      </div>
    );
  }

  // Success — click to open the full-size detail overlay.
  const image = slot.image!;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(image)}
        className={`group cursor-zoom-in transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(51,32,26,0.35)] ${cardClass}`}
        style={aspectStyle}
        aria-label="Open generated ad"
      >
        <img
          src={image.url}
          alt="Generated ad"
          className="size-full object-cover transition-transform group-hover:scale-[1.03]"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.missing-image-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className =
                'missing-image-placeholder grid size-full place-items-center p-4 text-center text-xs text-[var(--base-color-brand--umber)]';
              placeholder.textContent = 'This image is no longer available.';
              parent.appendChild(placeholder);
            }
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onToggleCompare(slot.id)}
        className={`absolute top-2 left-2 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wide ${
          compareSelected
            ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
            : 'border-[var(--base-color-brand--umber)]/60 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
        }`}
        style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
      >
        {compareSelected ? 'Selected' : 'Compare'}
      </button>
    </div>
  );
}
