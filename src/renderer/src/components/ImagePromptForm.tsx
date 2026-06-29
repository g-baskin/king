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
import { kingApi } from '@/lib/kingApi';
import type { GeneratedImage } from '@/components/image';
import type { EntityData } from '@/types/electron';

// Same option list the Settings modal uses — kept in lockstep so the
// labels don't drift between surfaces.
const MODEL_OPTIONS: { value: ImageModel; label: string }[] = [
  { value: 'nano_banana_pro', label: 'Nano Banana Pro' },
  { value: 'gpt_image_2', label: 'GPT Image 2' },
];

interface ReferenceImage {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  isLoading: boolean;
}

type MentionKind = 'image' | 'product' | 'character';

interface MentionSuggestion {
  id: string;
  kind: MentionKind;
  label: string;
  subtitle: string;
  imageUrls: string[];
  thumbnailUrl?: string | null;
  productType?: string;
}

interface ActiveMentionQuery {
  start: number;
  end: number;
  query: string;
}

const MENTION_QUERY_DELIMITER_REGEX = /[\s.,!?;:()[\]{}<>/"'`\\|]/;

function getActiveMentionQuery(
  value: string,
  caretPosition: number | null,
): ActiveMentionQuery | null {
  if (caretPosition === null || caretPosition < 0) return null;

  const beforeCaret = value.slice(0, caretPosition);
  const start = beforeCaret.lastIndexOf('@');
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(value[start - 1] ?? '')) return null;

  const query = value.slice(start + 1, caretPosition);
  if (MENTION_QUERY_DELIMITER_REGEX.test(query)) return null;

  return { start, end: caretPosition, query };
}

function matchesMentionQuery(suggestion: MentionSuggestion, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [suggestion.label, suggestion.subtitle, suggestion.productType].some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(normalizedQuery),
  );
}

function formatMentionSubtitle(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 96) return normalized;
  return `${normalized.slice(0, 93)}...`;
}

function buildImageMentionLabel(image: GeneratedImage, index: number): string {
  const normalizedPrompt = image.prompt.replace(/[^a-z0-9\s-]/gi, ' ').trim();
  const slug = normalizedPrompt.split(/\s+/).filter(Boolean).slice(0, 3).join('-').toLowerCase();
  const imageIndex = String(index + 1);
  return slug ? `image-${imageIndex}-${slug}` : `image-${imageIndex}`;
}

function createReferenceImageFromUrl(url: string): ReferenceImage {
  return {
    id: `${String(Date.now())}-${Math.random().toString(36).slice(2)}`,
    preview: url,
    url,
    isLoading: false,
  };
}

function mergeReferenceImageUrls(current: ReferenceImage[], urls: string[]): ReferenceImage[] {
  const next = [...current];
  const seenUrls = new Set(current.map((img) => img.url ?? img.preview));

  for (const url of urls) {
    if (!url || seenUrls.has(url)) continue;
    if (next.length >= MAX_REFERENCE_IMAGES) break;
    next.push(createReferenceImageFromUrl(url));
    seenUrls.add(url);
  }

  return next;
}

function getCharacterPrimaryReferenceUrl(character: EntityData): string | null {
  if (character.referenceImages.length === 0) return null;

  const primaryIndex =
    typeof character.primaryReferenceIndex === 'number' &&
    character.primaryReferenceIndex >= 0 &&
    character.primaryReferenceIndex < character.referenceImages.length
      ? character.primaryReferenceIndex
      : 0;

  return character.referenceImages[primaryIndex] ?? null;
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
  initialAspectRatio?: string | null;
  disableCinemaModifiers?: boolean;
  submitLabel?: string;
  mentionImages?: GeneratedImage[];
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
  initialAspectRatio,
  disableCinemaModifiers = false,
  submitLabel = 'Generate',
  mentionImages = [],
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
  const [activeMentionQuery, setActiveMentionQuery] = useState<ActiveMentionQuery | null>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoReferenceSelectionAppliedRef = useRef(false);
  const autoProductSelectionAppliedRef = useRef(false);
  const maxImages = MAX_IMAGES_PER_GENERATION;

  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const initialCinema = useMemo(() => loadPersistedCinema(), []);
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings>(initialCinema.settings);
  const [cinemaModifiersEnabled, setCinemaModifiersEnabled] = useState(
    initialCinema.modifiersEnabled,
  );
  const [cinemaApplyConfirmed, setCinemaApplyConfirmed] = useState(false);

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

  useEffect(() => {
    setCinemaApplyConfirmed(false);
  }, [cinemaModifiersEnabled]);

  // Fetch products and characters for the entity selector
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [p, c] = await Promise.all([
          kingApi.entities.list('products', activeWorkspaceId),
          kingApi.entities.list('characters', activeWorkspaceId),
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

  const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
    const imageSuggestions = mentionImages
      .slice(0, 12)
      .reduce<MentionSuggestion[]>((suggestions, image, index) => {
        if (!image.url) return suggestions;
        suggestions.push({
          id: `image:${image.id}`,
          kind: 'image',
          label: buildImageMentionLabel(image, index),
          subtitle: formatMentionSubtitle(image.prompt || 'Generated image reference'),
          imageUrls: [image.url],
          thumbnailUrl: image.thumbnailUrl ?? image.url,
        });
        return suggestions;
      }, []);

    const productSuggestions = products.reduce<MentionSuggestion[]>((suggestions, product) => {
      const referenceCount = product.referenceImages.length;
      const referenceCountLabel = String(referenceCount);
      suggestions.push({
        id: `product:${product.id}`,
        kind: 'product',
        label: product.name,
        subtitle: product.productType
          ? `Product · ${product.productType} · ${referenceCountLabel} ref${
              referenceCount === 1 ? '' : 's'
            }`
          : `Product · ${referenceCountLabel} ref${referenceCount === 1 ? '' : 's'}`,
        imageUrls: product.referenceImages,
        thumbnailUrl: product.thumbnailUrl ?? product.referenceImages[0] ?? null,
        ...(product.productType ? { productType: product.productType } : {}),
      });
      return suggestions;
    }, []);

    const characterSuggestions = characters.reduce<MentionSuggestion[]>(
      (suggestions, character) => {
        const primaryUrl = getCharacterPrimaryReferenceUrl(character);
        if (!primaryUrl) return suggestions;
        suggestions.push({
          id: `character:${character.id}`,
          kind: 'character',
          label: character.name,
          subtitle: 'Character · primary reference',
          imageUrls: [primaryUrl],
          thumbnailUrl: character.thumbnailUrl ?? primaryUrl,
        });
        return suggestions;
      },
      [],
    );

    return [...imageSuggestions, ...productSuggestions, ...characterSuggestions];
  }, [characters, mentionImages, products]);

  const activeMentionSuggestions = useMemo(() => {
    if (!mentionMenuOpen || !activeMentionQuery) return [];

    if (!activeMentionQuery.query.trim()) {
      return [
        ...mentionSuggestions.filter((suggestion) => suggestion.kind === 'image').slice(0, 3),
        ...mentionSuggestions.filter((suggestion) => suggestion.kind === 'product').slice(0, 3),
        ...mentionSuggestions.filter((suggestion) => suggestion.kind === 'character').slice(0, 2),
      ].slice(0, 8);
    }

    return mentionSuggestions
      .filter((suggestion) => matchesMentionQuery(suggestion, activeMentionQuery.query))
      .slice(0, 8);
  }, [activeMentionQuery, mentionMenuOpen, mentionSuggestions]);

  const updateMentionMenu = useCallback((value: string, caretPosition: number | null) => {
    const nextQuery = getActiveMentionQuery(value, caretPosition);
    setActiveMentionQuery(nextQuery);
    setMentionMenuOpen(!!nextQuery);
    setHighlightedMentionIndex(0);
  }, []);

  const closeMentionMenu = useCallback(() => {
    setActiveMentionQuery(null);
    setMentionMenuOpen(false);
    setHighlightedMentionIndex(0);
  }, []);

  const safeHighlightedMentionIndex =
    activeMentionSuggestions.length === 0
      ? 0
      : Math.min(highlightedMentionIndex, activeMentionSuggestions.length - 1);

  const mapReferenceUrls = useCallback((urls: string[]): ReferenceImage[] => {
    const dedupedUrls: string[] = [];

    for (const url of urls) {
      if (!url || dedupedUrls.includes(url)) continue;
      if (dedupedUrls.length >= MAX_REFERENCE_IMAGES) break;
      dedupedUrls.push(url);
    }

    return dedupedUrls.map(createReferenceImageFromUrl);
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
        const primaryUrl = character ? getCharacterPrimaryReferenceUrl(character) : null;
        if (
          primaryUrl &&
          resolvedUrls.length < MAX_REFERENCE_IMAGES &&
          !resolvedUrls.includes(primaryUrl)
        ) {
          resolvedUrls.push(primaryUrl);
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
    setImageCount(1);
    if (
      initialAspectRatio &&
      aspectRatioOptions.some((option) => option.value === initialAspectRatio)
    ) {
      setAspectRatio(initialAspectRatio);
    }
  }, [aspectRatioOptions, initialAspectRatio, intentPrompt]);

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
    const hasReferenceOverride = additionalReferenceImageUrls.length > 0;
    const hasAnyOverride = hasProductOverride || hasCharacterOverride || hasReferenceOverride;

    const productOverrideValue = hasProductOverride ? selectedProductOverride : null;
    const characterOverrideValue = hasCharacterOverride ? selectedCharacterOverride : null;

    if (productOverrideValue) {
      autoProductSelectionAppliedRef.current = true;
      if (selectedEntity !== productOverrideValue) {
        setSelectedEntity(productOverrideValue);
      }
    } else if (autoProductSelectionAppliedRef.current && selectedEntity.startsWith('product:')) {
      autoProductSelectionAppliedRef.current = false;
      setSelectedEntity('none');
    }

    if (hasAnyOverride) {
      autoReferenceSelectionAppliedRef.current = true;
      applyEntitySelections(productOverrideValue, characterOverrideValue);
      return;
    }

    if (autoReferenceSelectionAppliedRef.current) {
      autoReferenceSelectionAppliedRef.current = false;
      autoProductSelectionAppliedRef.current = false;
      if (selectedEntity.startsWith('product:')) {
        setSelectedEntity('none');
      }
      setReferenceImages([]);
    }
  }, [
    additionalReferenceImageUrls.length,
    applyEntitySelections,
    selectedCharacterOverride,
    selectedProductOverride,
  ]);

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

  const selectMentionSuggestion = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!activeMentionQuery) return;

      const token = `@${suggestion.label} `;
      const nextPrompt = `${prompt.slice(0, activeMentionQuery.start)}${token}${prompt.slice(
        activeMentionQuery.end,
      )}`;
      const nextCaretPosition = activeMentionQuery.start + token.length;

      setPrompt(nextPrompt);
      setReferenceImages((prev) => mergeReferenceImageUrls(prev, suggestion.imageUrls));
      if (suggestion.kind === 'product') {
        setSelectedEntity(suggestion.id);
      }
      closeMentionMenu();

      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
        autoResizeTextarea();
      });
    },
    [activeMentionQuery, autoResizeTextarea, closeMentionMenu, prompt],
  );

  const isImagesLoading = referenceImages.some((img) => img.isLoading);

  const handleCinemaApply = useCallback(() => {
    setCinemaApplyConfirmed(true);
    toast.success('Cinema optics applied to the image input.');
  }, []);

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

    if (!disableCinemaModifiers && !isGpt && cinemaModifiersEnabled) {
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

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextPrompt = e.target.value;
    setPrompt(nextPrompt);
    updateMentionMenu(nextPrompt, e.target.selectionStart);
    autoResizeTextarea();
  };

  const handlePromptSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateMentionMenu(e.currentTarget.value, e.currentTarget.selectionStart);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMenuOpen && activeMentionQuery) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedMentionIndex((index) =>
          activeMentionSuggestions.length === 0 ? 0 : (index + 1) % activeMentionSuggestions.length,
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedMentionIndex((index) =>
          activeMentionSuggestions.length === 0
            ? 0
            : (index - 1 + activeMentionSuggestions.length) % activeMentionSuggestions.length,
        );
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeMentionMenu();
        return;
      }

      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const suggestion = activeMentionSuggestions[safeHighlightedMentionIndex];
        if (suggestion) {
          selectMentionSuggestion(suggestion);
          return;
        }
        closeMentionMenu();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isImagesLoading && prompt.trim()) {
        handleSubmit(e);
      }
    }
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
      className="mx-auto w-full shrink-0 rounded-none border-t border-white/[0.08] bg-[rgba(8,9,13,0.92)] px-6 py-4 shadow-[0_-24px_70px_-46px_rgba(47,124,255,0.75)] backdrop-blur-xl"
    >
      <fieldset className="flex gap-3">
        {/* Left section */}
        <div className="min-h-0 min-w-0 flex-1 space-y-3">
          {/* Reference images preview */}
          {referenceImages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {referenceImages.map((img) => (
                <div key={img.id} className="group relative shrink-0">
                  <div className="relative size-14 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.035)]">
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
                          onClick={() => {
                            removeReferenceImage(img.id);
                          }}
                          className="absolute -top-3 -right-3 z-10 grid h-6 w-6 items-center justify-center rounded-full border border-white/[0.16] bg-[rgba(16,19,26,0.92)] text-[var(--base-color-brand--bean)] transition hover:border-[var(--base-color-brand--cinamon)] hover:text-[var(--base-color-brand--cream)] xl:opacity-0 xl:group-hover:opacity-100"
                        >
                          <CloseIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {referenceImages.length < MAX_REFERENCE_IMAGES && (
                <div className="relative size-14 shrink-0 rounded-xl border border-dashed border-[var(--base-color-brand--cinamon)]/45 bg-[rgba(47,124,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="grid size-full cursor-pointer items-center justify-center text-[var(--base-color-brand--cream)] transition hover:text-[var(--base-color-brand--bean)] active:opacity-60"
                  >
                    <ImageAddIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt row */}
          <div className="relative">
            {mentionMenuOpen && activeMentionQuery && (
              <div className="absolute right-0 bottom-full left-0 z-30 mb-3 overflow-hidden rounded-2xl border border-white/[0.1] bg-[rgba(16,19,26,0.96)] shadow-[0_22px_60px_-28px_rgba(47,124,255,0.75)] backdrop-blur-xl">
                <div className="border-b border-white/[0.08] px-3 py-2 text-[10px] font-bold tracking-[0.18em] text-[var(--base-color-brand--umber)] uppercase">
                  References
                </div>
                {activeMentionSuggestions.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto p-1">
                    {activeMentionSuggestions.map((suggestion, index) => {
                      const highlighted = index === safeHighlightedMentionIndex;
                      return (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseEnter={() => {
                            setHighlightedMentionIndex(index);
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectMentionSuggestion(suggestion);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition ${
                            highlighted
                              ? 'border-[var(--base-color-brand--cinamon)]/70 bg-[rgba(47,124,255,0.22)]'
                              : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                            {suggestion.thumbnailUrl ? (
                              <img
                                src={suggestion.thumbnailUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="grid size-full place-items-center text-xs font-bold text-[var(--base-color-brand--umber)]">
                                @
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-[var(--base-color-brand--cinamon)]/45 px-2 py-0.5 text-[9px] font-bold tracking-wide text-[var(--base-color-brand--bean)] uppercase">
                                {suggestion.kind}
                              </span>
                              <span className="truncate text-sm font-semibold text-[var(--text-color--text-primary)]">
                                {suggestion.label}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[var(--base-color-brand--umber)]">
                              {suggestion.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm font-medium text-[var(--base-color-brand--umber)]">
                    No references found
                  </div>
                )}
              </div>
            )}
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
                  className="relative -top-[5.5px] grid h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--base-color-brand--cinamon)]/45 bg-[rgba(47,124,255,0.08)] text-[var(--base-color-brand--cream)] transition hover:border-[var(--base-color-brand--cream)] hover:text-[var(--base-color-brand--bean)]"
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
                onChange={handlePromptChange}
                onSelect={handlePromptSelect}
                onKeyDown={handlePromptKeyDown}
                onBlur={closeMentionMenu}
                className="hide-scrollbar max-h-[120px] min-h-[40px] w-full resize-none rounded-none border-none bg-transparent p-0 text-[15px] text-[var(--text-color--text-primary)] placeholder:text-[var(--base-color-brand--umber)]/70 focus:outline-none"
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            <SelectDropdown
              options={MODEL_OPTIONS}
              value={selectedModel}
              onChange={(v) => {
                setSelectedModel(v as ImageModel);
              }}
              icon={<SparkleIcon />}
            />

            {!isGpt && (
              <>
                <label
                  className={`flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(255,255,255,0.035)] px-2.5 py-1 text-xs font-medium text-[var(--base-color-brand--bean)] select-none ${
                    disableCinemaModifiers ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={disableCinemaModifiers ? false : cinemaModifiersEnabled}
                    disabled={disableCinemaModifiers}
                    onChange={(e) => {
                      setCinemaModifiersEnabled(e.target.checked);
                    }}
                    className="rounded border-[var(--base-color-brand--umber)] text-[var(--base-color-brand--cinamon)] focus:ring-[var(--base-color-brand--cinamon)]"
                  />
                  Cinema optics
                </label>
                <button
                  type="button"
                  disabled={disableCinemaModifiers || !cinemaModifiersEnabled}
                  onClick={() => {
                    setCinemaModalOpen(true);
                  }}
                  className="flex max-w-[240px] min-w-0 flex-col items-start rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.035)] px-3 py-1.5 text-left transition hover:border-[var(--base-color-brand--cinamon)]/50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="w-full truncate text-[9px] font-bold tracking-wide text-[var(--base-color-brand--umber)] uppercase">
                    Cinema optics · {cinemaApplyConfirmed ? 'Applied' : 'Ready'}
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-[var(--base-color-brand--bean)]">
                    {cinemaSettings.camera} · {formatCinemaSummary(cinemaSettings)}
                  </span>
                  <span className="w-full truncate text-[9px] font-semibold text-[var(--base-color-brand--cinamon)]">
                    {cinemaApplyConfirmed ? 'Applied to image input' : 'Open and apply to confirm'}
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
            <div className="flex h-10 items-center gap-1 rounded-full border border-white/[0.08] bg-[rgba(255,255,255,0.035)] px-3">
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
            className="inline-grid h-full w-36 grid-flow-col items-center justify-center gap-2 rounded-full border border-[var(--base-color-brand--cream)]/20 bg-[linear-gradient(135deg,var(--base-color-brand--cinamon),var(--base-color-brand--red))] px-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_20px_44px_-24px_var(--base-color-brand--cinamon)] transition-all duration-150 hover:brightness-110 focus:outline-none active:translate-y-0.5 active:shadow-[0_10px_24px_-18px_var(--base-color-brand--cinamon)] disabled:cursor-not-allowed disabled:bg-[var(--base-color-brand--umber)] disabled:text-white/60 disabled:shadow-none"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {isImagesLoading ? 'Uploading...' : submitLabel}
              </span>
              <SparkleIcon />
            </div>
          </button>
        </aside>
      </fieldset>

      <CinemaControlsModal
        isOpen={cinemaModalOpen}
        onClose={() => {
          setCinemaModalOpen(false);
        }}
        settings={cinemaSettings}
        onSettingsChange={setCinemaSettings}
        onApply={handleCinemaApply}
      />
    </form>
  );
}
