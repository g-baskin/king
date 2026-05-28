import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import SelectDropdown from '@/components/ui/SelectDropdown';
import {
  PlusIcon,
  MinusIcon,
  SparkleIcon,
  CloseIcon,
  ResolutionIcon,
  FormatIcon,
  AutoIcon,
  aspectRatioIcons,
  ImageAddIcon,
  EntityIcon,
} from '@/components/icons';
import {
  nanoBananaAspectRatioOptions,
  gptImage2AspectRatioOptions,
  nanoBananaResolutionOptions,
  gptImage2QualityOptions,
  outputFormatOptions,
  MAX_REFERENCE_IMAGES,
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGES_PER_GENERATION,
  SUPPORTED_IMAGE_ACCEPT,
  SUPPORTED_IMAGE_MIME_REGEX,
} from '@/lib/constants/image-form';
import { renderPrompt } from '@/lib/productTypes';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  buildCinemaPrompt,
  DEFAULT_CINEMA_SETTINGS,
  formatCinemaSummary,
  type CinemaSettings,
} from '@/lib/cinema-prompt';
import CinemaControlsModal from '@/components/ui/CinemaControlsModal';
import { useModelStore, type ImageModel } from '@/stores/modelStore';

// Same option list the Settings modal uses — kept in lockstep so the
// labels don't drift between surfaces.
const MODEL_OPTIONS: { value: ImageModel; label: string }[] = [
  { value: 'nano_banana_pro', label: 'Nano Banana Pro' },
  { value: 'gpt_image_2', label: 'GPT Image 2' },
];
import type { EntityData } from '@/types/electron';

interface ReferenceImage {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  isLoading: boolean;
}

interface ImagePromptFormProps {
  onSubmit?: (data: {
    prompt: string;
    count: number;
    aspectRatio: string;
    resolution: string;
    outputFormat: string;
    referenceImages: string[];
  }) => void;
  initialPrompt?: string;
  recreateData?: { prompt: string } | null;
  editData?: { imageUrl: string } | null;
  forceEntitySelection?: string | null;
  selectedProductOverride?: string | null;
  selectedCharacterOverride?: string | null;
  additionalReferenceImageUrls?: string[];
  intentPrompt?: string | null;
}

const KING_CINEMA_STORAGE_KEY = 'king_cinema_v1';

function loadPersistedCinema(): {
  settings: CinemaSettings;
  modifiersEnabled: boolean;
} {
  try {
    const raw = localStorage.getItem(KING_CINEMA_STORAGE_KEY);
    if (!raw) {
      return {
        settings: { ...DEFAULT_CINEMA_SETTINGS },
        modifiersEnabled: true,
      };
    }
    const parsed = JSON.parse(raw) as {
      settings?: Partial<CinemaSettings>;
      modifiersEnabled?: boolean;
    };
    const settings: CinemaSettings = {
      ...DEFAULT_CINEMA_SETTINGS,
      ...parsed.settings,
      focal:
        typeof parsed.settings?.focal === 'number'
          ? parsed.settings.focal
          : DEFAULT_CINEMA_SETTINGS.focal,
    };
    return {
      settings,
      modifiersEnabled:
        typeof parsed.modifiersEnabled === 'boolean' ? parsed.modifiersEnabled : true,
    };
  } catch {
    return {
      settings: { ...DEFAULT_CINEMA_SETTINGS },
      modifiersEnabled: true,
    };
  }
}

export default function ImagePromptForm({
  onSubmit,
  initialPrompt = '',
  recreateData,
  editData,
  forceEntitySelection,
  selectedProductOverride,
  selectedCharacterOverride,
  additionalReferenceImageUrls = [],
  intentPrompt,
}: ImagePromptFormProps) {
  const selectedModel = useModelStore((s) => s.selectedModel);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);
  const isGpt = selectedModel === 'gpt_image_2';
  const aspectRatioOptions = isGpt ? gptImage2AspectRatioOptions : nanoBananaAspectRatioOptions;
  const resolutionOptions = isGpt ? gptImage2QualityOptions : nanoBananaResolutionOptions;

  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedEntity, setSelectedEntity] = useState('none');
  const [imageCount, setImageCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState(isGpt ? 'high' : '1K');
  const [outputFormat, setOutputFormat] = useState('png');

  // Reconcile selections when the user switches models from Settings.
  // Both ratio and resolution have model-specific value sets — if the
  // current selection isn't valid for the new model, snap to a sensible
  // default rather than rendering a blank dropdown label.
  useEffect(() => {
    if (!aspectRatioOptions.some((o) => o.value === aspectRatio)) {
      setAspectRatio('1:1');
    }
    if (!resolutionOptions.some((o) => o.value === resolution)) {
      setResolution(isGpt ? 'high' : '1K');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [products, setProducts] = useState<EntityData[]>([]);
  const [characters, setCharacters] = useState<EntityData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxImages = MAX_IMAGES_PER_GENERATION;

  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const initialCinema = useMemo(() => loadPersistedCinema(), []);
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings>(initialCinema.settings);
  const [cinemaModifiersEnabled, setCinemaModifiersEnabled] = useState(
    initialCinema.modifiersEnabled,
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        KING_CINEMA_STORAGE_KEY,
        JSON.stringify({
          settings: cinemaSettings,
          modifiersEnabled: cinemaModifiersEnabled,
        }),
      );
    } catch {
      /* ignore quota */
    }
  }, [cinemaSettings, cinemaModifiersEnabled]);

  // Fetch products and characters for the entity selector
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [p, c] = await Promise.all([
          window.api.entities.list('products', activeWorkspaceId),
          window.api.entities.list('characters', activeWorkspaceId),
        ]);
        setProducts(p);
        setCharacters(c);
      } catch {
        // Silently fail
      }
    };
    fetchEntities();
  }, [activeWorkspaceId]);

  // Build entity selector options.
  // Characters are intentionally excluded here and selected via the dedicated
  // character strip on ImagePage so products/characters are separate surfaces.
  const entityOptions = [
    { value: 'none', label: 'Default' },
    ...(products.length > 0
      ? [
          { value: '_product_header', label: 'Products', disabled: true },
          ...products.map((p) => ({ value: `product:${p.id}`, label: p.name })),
        ]
      : []),
  ];

  const mapReferenceUrls = useCallback((urls: string[]): ReferenceImage[] => {
    return urls.slice(0, MAX_REFERENCE_IMAGES).map((url) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      preview: url,
      url,
      isLoading: false,
    }));
  }, []);

  const applyEntitySelections = useCallback(
    (productEntityValue: string | null, characterEntityValue: string | null) => {
      const resolvedUrls: string[] = [];

      for (const url of additionalReferenceImageUrls) {
        if (resolvedUrls.length >= MAX_REFERENCE_IMAGES) break;
        if (!resolvedUrls.includes(url)) resolvedUrls.push(url);
      }

      if (productEntityValue && productEntityValue.startsWith('product:')) {
        const productId = productEntityValue.slice('product:'.length);
        const product = products.find((p) => p.id === productId);
        if (product) {
          for (const url of product.referenceImages) {
            if (resolvedUrls.length >= MAX_REFERENCE_IMAGES) break;
            if (!resolvedUrls.includes(url)) resolvedUrls.push(url);
          }
        }
      }

      if (characterEntityValue && characterEntityValue.startsWith('character:')) {
        const characterId = characterEntityValue.slice('character:'.length);
        const character = characters.find((c) => c.id === characterId);
        if (character && character.referenceImages.length > 0) {
          const primaryIndex =
            typeof character.primaryReferenceIndex === 'number' &&
            character.primaryReferenceIndex >= 0 &&
            character.primaryReferenceIndex < character.referenceImages.length
              ? character.primaryReferenceIndex
              : 0;
          const primaryUrl = character.referenceImages[primaryIndex];
          if (
            primaryUrl &&
            resolvedUrls.length < MAX_REFERENCE_IMAGES &&
            !resolvedUrls.includes(primaryUrl)
          ) {
            resolvedUrls.push(primaryUrl);
          }
        }
      }

      setReferenceImages(mapReferenceUrls(resolvedUrls));
    },
    [additionalReferenceImageUrls, characters, mapReferenceUrls, products],
  );

  // When a product is selected from the dropdown, load only product refs.
  const handleEntityChange = useCallback(
    (value: string) => {
      setSelectedEntity(value);
      if (value === 'none') {
        setReferenceImages([]);
        return;
      }
      applyEntitySelections(value, null);
    },
    [applyEntitySelections],
  );

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '40px';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [prompt, autoResizeTextarea]);

  // Handle recreate data
  useEffect(() => {
    if (recreateData) {
      setPrompt(recreateData.prompt);
      setReferenceImages([]);
    }
  }, [recreateData]);

  // Handle cross-page intent prompt (Characters -> Image flow)
  useEffect(() => {
    if (!intentPrompt) return;
    setPrompt(intentPrompt);
  }, [intentPrompt]);

  // Handle edit data
  useEffect(() => {
    if (!editData?.imageUrl) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPrompt('');
    setReferenceImages([
      {
        id,
        preview: editData.imageUrl,
        url: editData.imageUrl,
        isLoading: false,
      },
    ]);
  }, [editData]);

  useEffect(() => {
    if (!forceEntitySelection || forceEntitySelection === selectedEntity) return;
    handleEntityChange(forceEntitySelection);
  }, [forceEntitySelection, handleEntityChange, selectedEntity]);

  useEffect(() => {
    const hasProductOverride = !!selectedProductOverride && selectedProductOverride !== 'none';
    const hasCharacterOverride =
      !!selectedCharacterOverride && selectedCharacterOverride !== 'none';

    if (!hasProductOverride && !hasCharacterOverride) return;

    applyEntitySelections(
      hasProductOverride ? selectedProductOverride : null,
      hasCharacterOverride ? selectedCharacterOverride : null,
    );
  }, [applyEntitySelections, selectedCharacterOverride, selectedProductOverride]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        if (!SUPPORTED_IMAGE_MIME_REGEX.test(file.type)) continue;
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) continue;
        if (referenceImages.length + validFiles.length >= MAX_REFERENCE_IMAGES) break;
        validFiles.push(file);
      }

      const pendingImages: ReferenceImage[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        isLoading: true,
      }));

      setReferenceImages((prev) => [...prev, ...pendingImages].slice(0, MAX_REFERENCE_IMAGES));
      e.target.value = '';

      // Convert files to base64 data URLs so they're accessible from the main process
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const pending = pendingImages[i];
        if (!file || !pending) continue;
        const id = pending.id;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setReferenceImages((prev) =>
            prev.map((img) => (img.id === id ? { ...img, url: dataUrl, isLoading: false } : img)),
          );
        };
        reader.readAsDataURL(file);
      }
    },
    [referenceImages.length],
  );

  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const isImagesLoading = referenceImages.some((img) => img.isLoading);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isImagesLoading) return;

    if (!prompt.trim()) {
      toast.error('Type a prompt first.');
      return;
    }

    const uploadedImageUrls = referenceImages
      .filter((img) => img.url)
      .map((img) => img.url as string);

    let selectedProductType: string | undefined;
    if (selectedEntity.startsWith('product:')) {
      const id = selectedEntity.slice('product:'.length);
      selectedProductType = products.find((p) => p.id === id)?.productType;
    }
    let resolvedPrompt = renderPrompt(prompt, selectedProductType);

    if (!isGpt && cinemaModifiersEnabled) {
      resolvedPrompt = buildCinemaPrompt(
        resolvedPrompt,
        cinemaSettings.camera,
        cinemaSettings.lens,
        cinemaSettings.focal,
        cinemaSettings.aperture,
      );
    }

    onSubmit?.({
      prompt: resolvedPrompt,
      count: imageCount,
      aspectRatio,
      resolution,
      outputFormat,
      referenceImages: uploadedImageUrls,
    });
  };

  const incrementCount = () => {
    setImageCount((prev) => Math.min(prev + 1, maxImages));
  };

  const decrementCount = () => {
    setImageCount((prev) => Math.max(prev - 1, 1));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full shrink-0 rounded-none border-t border-[var(--base-color-brand--umber)]/20 bg-[var(--base-color-brand--champagne)] px-6 py-4 shadow-[0_-8px_32px_-8px_rgba(51,32,26,0.12)]"
    >
      <fieldset className="flex gap-3">
        {/* Left section */}
        <div className="min-h-0 min-w-0 flex-1 space-y-3">
          {/* Reference images preview */}
          {referenceImages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {referenceImages.map((img) => (
                <div key={img.id} className="group relative shrink-0">
                  <div className="relative size-14 rounded-xl bg-[var(--base-color-brand--shell)]">
                    {img.isLoading ? (
                      <div className="skeleton-loader size-full rounded-xl" />
                    ) : (
                      <>
                        <img
                          src={img.preview}
                          alt="Reference"
                          className="size-full rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeReferenceImage(img.id)}
                          className="absolute -top-3 -right-3 z-10 grid h-6 w-6 items-center justify-center rounded-full border border-[var(--base-color-brand--umber)]/60 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)] transition hover:bg-[var(--base-color-brand--bean)] hover:text-[var(--base-color-brand--shell)] xl:opacity-0 xl:group-hover:opacity-100"
                        >
                          <CloseIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {referenceImages.length < MAX_REFERENCE_IMAGES && (
                <div className="relative size-14 shrink-0 rounded-xl border border-dashed border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="grid size-full cursor-pointer items-center justify-center text-[var(--base-color-brand--umber)] transition hover:text-[var(--base-color-brand--bean)] active:opacity-60"
                  >
                    <ImageAddIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt row */}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              onChange={handleFileSelect}
            />
            {referenceImages.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative -top-[5.5px] grid h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)] transition hover:border-[var(--base-color-brand--cinamon)] hover:text-[var(--base-color-brand--cinamon)]"
                title="Add reference images (max 8)"
              >
                <PlusIcon />
              </button>
            )}
            <textarea
              ref={textareaRef}
              name="prompt"
              placeholder="Describe the scene you imagine"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                autoResizeTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isImagesLoading && prompt.trim()) {
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }
              }}
              className="hide-scrollbar max-h-[120px] min-h-[40px] w-full resize-none rounded-none border-none bg-transparent p-0 text-[15px] text-[var(--text-color--text-primary)] placeholder:text-[var(--base-color-brand--umber)]/70 focus:outline-none"
            />
          </div>

          {/* Controls row */}
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            <SelectDropdown
              options={MODEL_OPTIONS}
              value={selectedModel}
              onChange={(v) => setSelectedModel(v as ImageModel)}
              icon={<SparkleIcon />}
            />

            {!isGpt && (
              <>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] px-2.5 py-1 text-xs font-medium text-[var(--base-color-brand--bean)] select-none">
                  <input
                    type="checkbox"
                    checked={cinemaModifiersEnabled}
                    onChange={(e) => setCinemaModifiersEnabled(e.target.checked)}
                    className="rounded border-[var(--base-color-brand--umber)] text-[var(--base-color-brand--cinamon)] focus:ring-[var(--base-color-brand--cinamon)]"
                  />
                  Cinema optics
                </label>
                <button
                  type="button"
                  disabled={!cinemaModifiersEnabled}
                  onClick={() => setCinemaModalOpen(true)}
                  className="flex max-w-[200px] min-w-0 flex-col items-start rounded-2xl border border-[var(--base-color-brand--umber)]/40 bg-[var(--base-color-brand--shell)] px-3 py-1.5 text-left transition hover:border-[var(--base-color-brand--cinamon)]/50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="w-full truncate text-[9px] font-bold tracking-wide text-[var(--base-color-brand--umber)] uppercase">
                    {cinemaSettings.camera}
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-[var(--base-color-brand--bean)]">
                    {formatCinemaSummary(cinemaSettings)}
                  </span>
                </button>
              </>
            )}

            <SelectDropdown
              options={entityOptions}
              value={selectedEntity}
              onChange={handleEntityChange}
              icon={<EntityIcon />}
            />

            {/* Image count selector */}
            <div className="flex h-10 items-center gap-1 rounded-full border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3">
              <button
                type="button"
                onClick={decrementCount}
                disabled={imageCount <= 1}
                className="text-[var(--base-color-brand--bean)] transition-colors hover:text-[var(--base-color-brand--cinamon)] disabled:opacity-40 disabled:hover:text-[var(--base-color-brand--bean)]"
              >
                <MinusIcon />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-[var(--base-color-brand--bean)]">
                {imageCount}
                <span className="text-[var(--base-color-brand--umber)]">/{maxImages}</span>
              </span>
              <button
                type="button"
                onClick={incrementCount}
                disabled={imageCount >= maxImages}
                className="text-[var(--base-color-brand--bean)] transition-colors hover:text-[var(--base-color-brand--cinamon)] disabled:opacity-40 disabled:hover:text-[var(--base-color-brand--bean)]"
              >
                <PlusIcon />
              </button>
            </div>

            <SelectDropdown
              options={aspectRatioOptions}
              value={aspectRatio}
              onChange={setAspectRatio}
              icon={aspectRatioIcons[aspectRatio] || <AutoIcon />}
              showIcons
            />

            <SelectDropdown
              options={resolutionOptions}
              value={resolution}
              onChange={setResolution}
              icon={<ResolutionIcon />}
            />

            <SelectDropdown
              options={outputFormatOptions}
              value={outputFormat}
              onChange={setOutputFormat}
              icon={<FormatIcon />}
            />
          </div>
        </div>

        {/* Right section - Generate button */}
        <aside className="flex h-[84px] items-end justify-end gap-3 self-end">
          <button
            type="submit"
            disabled={isImagesLoading}
            tabIndex={-1}
            className="inline-grid h-full w-36 grid-flow-col items-center justify-center gap-2 rounded-full border-none bg-[var(--base-color-brand--cinamon)] px-2.5 text-sm font-semibold tracking-wide text-[var(--base-color-brand--shell)] shadow-[0_4px_0_0_var(--base-color-brand--dark-red)] transition-all duration-150 hover:bg-[var(--base-color-brand--red)] focus:outline-none active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--base-color-brand--dark-red)] disabled:cursor-not-allowed disabled:bg-[var(--base-color-brand--umber)] disabled:text-[var(--base-color-brand--shell)]/70 disabled:shadow-[0_4px_0_0_var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {isImagesLoading ? 'Uploading...' : 'Generate'}
              </span>
              <SparkleIcon />
            </div>
          </button>
        </aside>
      </fieldset>

      <CinemaControlsModal
        isOpen={cinemaModalOpen}
        onClose={() => setCinemaModalOpen(false)}
        settings={cinemaSettings}
        onSettingsChange={setCinemaSettings}
      />
    </form>
  );
}
