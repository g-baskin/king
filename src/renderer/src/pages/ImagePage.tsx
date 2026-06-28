import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { CloseIcon, DeleteIcon } from '@/components/icons';
import ImagePromptForm from '@/components/ImagePromptForm';
import {
  ImageEmptyState,
  ImageDetailOverlay,
  VirtualizedImageGrid,
  type GeneratedImage,
} from '@/components/image';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { useImages } from '@/hooks';
import { useGenerationStore } from '@/stores/generationStore';
import { useModelStore } from '@/stores/modelStore';
import type { CharacterConsistencyIntent } from '@/stores/imageIntentStore';
import type { EntityData } from '@/types/electron';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { kingApi } from '@/lib/kingApi';

interface ImagePageProps {
  prefillPrompt?: string | null;
  prefillPromptMeta?: {
    requiresProduct?: boolean | undefined;
    recommendedEntityType?: 'product' | 'character' | undefined;
  } | null;
  onPromptConsumed?: () => void;
  imageIntent?: CharacterConsistencyIntent | null;
  onImageIntentConsumed?: () => void;
}

export default function ImagePage({
  prefillPrompt,
  prefillPromptMeta,
  onPromptConsumed,
  imageIntent,
  onImageIntentConsumed,
}: ImagePageProps) {
  // Split single-atom selectors so ImagePage only re-renders when one of
  // these slices actually changes. Destructuring the whole store returns a
  // fresh object on every store update and triggers spurious renders.
  const pendingImageGenerations = useGenerationStore((s) => s.pendingImageGenerations);
  const addImageGeneration = useGenerationStore((s) => s.addImageGeneration);
  const removeImageGeneration = useGenerationStore((s) => s.removeImageGeneration);
  const pendingCount = pendingImageGenerations.length;
  const selectedModel = useModelStore((s) => s.selectedModel);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [recreateData, setRecreateData] = useState<{ prompt: string } | null>(null);
  const [intentPrompt, setIntentPrompt] = useState<string | null>(null);
  const [promptFormSeed, setPromptFormSeed] = useState(0);
  const [editData, setEditData] = useState<{ imageUrl: string } | null>(null);

  // Handle prefilled prompt from Prompts page
  useEffect(() => {
    if (prefillPrompt) {
      setRecreateData({ prompt: prefillPrompt });
      onPromptConsumed?.();
    }
  }, [prefillPrompt, onPromptConsumed]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [promptNeedsProduct, setPromptNeedsProduct] = useState(false);
  const [promptNeedsCharacter, setPromptNeedsCharacter] = useState(false);
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [forceEntitySelection, setForceEntitySelection] = useState<string | null>(null);
  const [products, setProducts] = useState<EntityData[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [characters, setCharacters] = useState<EntityData[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [selectedProductEntity, setSelectedProductEntity] = useState<string>('none');
  const [selectedCharacterEntity, setSelectedCharacterEntity] = useState<string>('none');
  const [consistencyTemplateImageUrl, setConsistencyTemplateImageUrl] = useState<string | null>(
    null,
  );

  // Handle cross-page intent from Characters tab (Generate button).
  useEffect(() => {
    const resolvedIntent = imageIntent ?? null;

    console.info('[intent] image page effect', { imageIntent, resolvedIntent });
    if (!resolvedIntent || resolvedIntent.type !== 'character-consistency-sheet') return;

    setRecreateData({ prompt: resolvedIntent.prompt });
    setIntentPrompt(resolvedIntent.prompt);
    setPromptFormSeed((prev) => prev + 1);
    setSelectedCharacterEntity(resolvedIntent.characterEntity);
    setPromptNeedsCharacter(true);
    setConsistencyTemplateImageUrl(resolvedIntent.templateImageUrl ?? null);

    onImageIntentConsumed?.();
    toast.success('Character consistency prompt loaded.');
  }, [imageIntent, onImageIntentConsumed]);

  const {
    images: allImages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore: loadMoreImages,
    addImage,
    deleteImage,
    deleteImages,
    downloadImage: handleDownload,
  } = useImages(activeWorkspace.id);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const generatedImages = allImages;

  useEffect(() => {
    if (!(prefillPrompt && prefillPromptMeta?.requiresProduct)) return;

    setPromptNeedsProduct(true);
    void (async () => {
      try {
        const products = await kingApi.entities.list('products', activeWorkspace.id);
        setProductOptions(products.map((p) => ({ id: p.id, name: p.name })));
      } catch {
        setProductOptions([]);
      }
    })();
  }, [prefillPrompt, prefillPromptMeta]);

  useEffect(() => {
    if (!(prefillPrompt && prefillPromptMeta?.recommendedEntityType === 'character')) return;
    setPromptNeedsCharacter(true);
  }, [prefillPrompt, prefillPromptMeta]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [productList, characterList] = await Promise.all([
          kingApi.entities.list('products', activeWorkspace.id),
          kingApi.entities.list('characters', activeWorkspace.id),
        ]);
        if (!cancelled) {
          setProducts(productList);
          setCharacters(characterList);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setCharacters([]);
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
          setCharactersLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace.id]);
  const selectedCount = selectedImages.size;

  const clearSelection = useCallback(() => setSelectedImages(new Set()), []);

  const handleBatchDeleteClick = useCallback(() => {
    if (selectedCount === 0) return;
    setBatchDeleteOpen(true);
  }, [selectedCount]);

  const confirmBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedImages);
    setBatchDeleteOpen(false);
    setSelectedImages(new Set());
    await deleteImages(ids);
  }, [selectedImages, deleteImages]);

  const batchDeleteMessage = useMemo(
    () =>
      `Are you sure you want to delete ${selectedCount} image${
        selectedCount === 1 ? '' : 's'
      }? This action cannot be undone.`,
    [selectedCount],
  );

  const toggleSelectImage = useCallback((id: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    await deleteImage(id);
  }, [deleteConfirmId, deleteImage]);

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleImageClick = useCallback((img: GeneratedImage) => {
    setSelectedImage(img);
  }, []);

  const handleEdit = useCallback((imageUrl: string) => {
    setEditData({ imageUrl });
  }, []);

  const handleGenerate = (data: {
    prompt: string;
    count: number;
    aspectRatio: string;
    resolution: string;
    outputFormat: string;
    referenceImages: string[];
  }) => {
    const generationIds: string[] = [];
    for (let i = 0; i < data.count; i++) {
      const id = `img-${Date.now()}-${i}`;
      generationIds.push(id);
      addImageGeneration(id, data.prompt);
    }

    const generateImages = async () => {
      let successCount = 0;

      for (let i = 0; i < data.count; i++) {
        const generationId = generationIds[i];
        if (!generationId) continue;
        try {
          const result = await kingApi.generate.image({
            prompt: data.prompt,
            aspectRatio: data.aspectRatio,
            resolution: data.resolution,
            outputFormat: data.outputFormat,
            imageUrls: data.referenceImages,
            modelVariant: selectedModel,
          });

          if (!result.success || !result.resultUrls?.length) {
            toast.error("Couldn't generate that image. Please try again.");
            removeImageGeneration(generationId);
            continue;
          }

          for (const url of result.resultUrls) {
            const savedImage = await kingApi.images.save({
              url,
              prompt: data.prompt,
              aspectRatio: data.aspectRatio,
              workspaceId: activeWorkspace.id,
            });

            addImage(savedImage);
            successCount++;
          }

          removeImageGeneration(generationId);
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          );
          removeImageGeneration(generationId);
        }
      }

      if (successCount > 0) {
        toast.success(`Generated ${successCount} image${successCount > 1 ? 's' : ''}.`);
      }
    };

    generateImages().catch((error) => {
      console.error('Unhandled error in image generation:', error);
      toast.error('Something went wrong. Please try again.');
      generationIds.forEach((id) => removeImageGeneration(id));
    });
  };

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Scrollable image gallery — flex-1 so the form below always stays
            on screen regardless of window height. */}
        <div className="relative min-h-0 flex-1 px-4 pt-4">
          {/* Selection toolbar — slides down from the top-right of the image
            grid whenever at least one image is selected. Contains a count,
            a delete action, and a clear-selection button. */}
          <div
            aria-hidden={selectedCount === 0}
            className={`absolute top-4 right-4 z-20 transition-all duration-200 ease-out ${
              selectedCount > 0
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-3 opacity-0'
            }`}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[rgba(16,19,26,0.86)] py-1.5 pr-1.5 pl-4 shadow-[0_18px_48px_-28px_rgba(47,124,255,0.45)] backdrop-blur-xl">
              <span
                className="text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={handleBatchDeleteClick}
                className="btn-cinamon btn-sm"
                title="Delete selected"
              >
                <DeleteIcon />
                Delete
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="grid h-7 w-7 place-items-center rounded-full text-[var(--base-color-brand--umber)] transition-colors hover:bg-[var(--base-color-brand--shell)] hover:text-[var(--base-color-brand--bean)]"
                title="Clear selection"
                aria-label="Clear selection"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="h-full rounded-[2rem] border border-white/[0.06] bg-[rgba(255,255,255,0.018)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-2 border-[var(--base-color-brand--umber)]/30 border-t-[var(--base-color-brand--bean)]" />
                  <span className="text-sm text-[var(--base-color-brand--umber)]">
                    Loading images...
                  </span>
                </div>
              </div>
            ) : generatedImages.length > 0 || pendingCount > 0 ? (
              <VirtualizedImageGrid
                images={generatedImages}
                selectedImages={selectedImages}
                onSelect={toggleSelectImage}
                onClick={handleImageClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onLoadMore={loadMoreImages}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                pendingCount={pendingCount}
              />
            ) : (
              <ImageEmptyState />
            )}
          </div>
        </div>
        {/* end scrollable gallery */}

        {promptNeedsProduct && (
          <div className="mx-6 mb-2 rounded-2xl border border-[var(--base-color-brand--cinamon)]/45 bg-[color-mix(in_srgb,var(--base-color-brand--cinamon)_18%,transparent)] p-3 shadow-[0_18px_44px_-28px_var(--base-color-brand--cinamon)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full bg-[var(--base-color-brand--cinamon)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--text-color--text-tertiary)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                Recommended
              </span>
              <span
                className="text-xs font-semibold text-[var(--text-color--text-primary)]"
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                This prompt works best with a product.
              </span>
              {productOptions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setForceEntitySelection(`product:${product.id}`);
                    setPromptNeedsProduct(false);
                    toast.success(`Selected ${product.name} for this prompt.`);
                  }}
                  className="rounded-full border border-[var(--base-color-brand--cinamon)] bg-[var(--base-color-brand--shell)] px-3 py-1 text-xs font-semibold text-[var(--text-color--text-primary)] hover:bg-[var(--base-color-brand--cinamon)] hover:text-[var(--text-color--text-tertiary)]"
                >
                  {product.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPromptNeedsProduct(false)}
                className="rounded-full border border-[var(--base-color-brand--cinamon)]/65 bg-transparent px-3 py-1 text-xs font-semibold text-[var(--text-color--text-primary)] hover:bg-[var(--base-color-brand--shell)]"
              >
                Use without product
              </button>
            </div>
          </div>
        )}

        {productsLoading || charactersLoading ? (
          <div className="mx-6 mb-2 rounded-2xl border border-white/[0.08] bg-[rgba(16,19,26,0.76)] px-4 py-2 text-xs text-[var(--base-color-brand--umber)] backdrop-blur-xl">
            Loading products and characters...
          </div>
        ) : (
          <div className="mx-6 mb-2 space-y-2 rounded-2xl border border-white/[0.08] bg-[rgba(16,19,26,0.76)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
            {products.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full bg-[var(--base-color-brand--shell)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--base-color-brand--bean)]"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  Products
                </span>
                <span className="text-xs text-[var(--base-color-brand--umber)]">
                  Tap to add product references.
                </span>
                {products.map((product) => {
                  const entityValue = `product:${product.id}`;
                  const active = selectedProductEntity === entityValue;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductEntity(entityValue);
                        toast.success(`Selected ${product.name} product references.`);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active
                          ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                          : 'border-[var(--base-color-brand--umber)]/45 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
                      }`}
                    >
                      {product.name}
                    </button>
                  );
                })}
              </div>
            )}

            {characters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full bg-[var(--base-color-brand--shell)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--base-color-brand--bean)]"
                  style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                >
                  Characters
                </span>
                <span className="text-xs text-[var(--base-color-brand--umber)]">
                  Tap to add character references.
                </span>
                {promptNeedsCharacter && (
                  <span className="rounded-full bg-[var(--base-color-brand--cinamon)] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[var(--text-color--text-tertiary)]">
                    Recommended for this prompt
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCharacterEntity('none')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    selectedCharacterEntity === 'none'
                      ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                      : 'border-[var(--base-color-brand--umber)]/45 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
                  }`}
                >
                  None
                </button>
                {characters.map((character) => {
                  const entityValue = `character:${character.id}`;
                  const active = selectedCharacterEntity === entityValue;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => {
                        setSelectedCharacterEntity(entityValue);
                        setPromptNeedsCharacter(false);
                        toast.success(`Selected ${character.name} character references.`);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active
                          ? 'border-[var(--base-color-brand--bean)] bg-[var(--base-color-brand--bean)] text-[var(--base-color-brand--shell)]'
                          : 'border-[var(--base-color-brand--umber)]/45 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--bean)]'
                      }`}
                      title={character.name}
                    >
                      {character.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ImagePromptForm
          key={promptFormSeed}
          onSubmit={handleGenerate}
          recreateData={recreateData}
          editData={editData}
          forceEntitySelection={forceEntitySelection}
          selectedProductOverride={selectedProductEntity}
          selectedCharacterOverride={selectedCharacterEntity}
          additionalReferenceImageUrls={
            consistencyTemplateImageUrl ? [consistencyTemplateImageUrl] : []
          }
          intentPrompt={intentPrompt}
        />
      </div>
      {/* end flex-col wrapper */}

      {selectedImage && (
        <ImageDetailOverlay
          image={selectedImage}
          images={generatedImages}
          onClose={() => setSelectedImage(null)}
          onDelete={(id) => {
            handleDelete(id);
            setSelectedImage(null);
          }}
          onDownload={handleDownload}
          onRecreate={(prompt) => {
            setRecreateData({ prompt });
            setSelectedImage(null);
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmId !== null}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <DeleteConfirmationModal
        isOpen={batchDeleteOpen}
        title={`Delete ${selectedCount} image${selectedCount === 1 ? '' : 's'}`}
        message={batchDeleteMessage}
        onConfirm={confirmBatchDelete}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </>
  );
}
