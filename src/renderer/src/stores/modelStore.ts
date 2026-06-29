import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Provider-aware image model selected in the Settings modal and prompt bar.
 * Persisted to localStorage so Image, Clone, and Create Ads use the same
 * generator across reloads.
 */
export type ImageModel =
  | 'kie_auto'
  | 'kie_gpt4o'
  | 'kie_flux_kontext_pro'
  | 'kie_flux_kontext_max'
  | 'nano_banana_pro'
  | 'gpt_image_2';

export type ImageModelProvider = 'kie' | 'fal';

export interface ImageModelOption {
  value: ImageModel;
  label: string;
  provider: ImageModelProvider;
  description: string;
}

export const DEFAULT_IMAGE_MODEL: ImageModel = 'kie_auto';

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    value: 'kie_auto',
    label: 'KIE Auto',
    provider: 'kie',
    description: 'Automatically picks KIE 4o or Flux Kontext for this request.',
  },
  {
    value: 'kie_gpt4o',
    label: 'KIE 4o Image',
    provider: 'kie',
    description: 'Best for photorealism, text rendering, and general image edits.',
  },
  {
    value: 'kie_flux_kontext_pro',
    label: 'KIE Flux Kontext Pro',
    provider: 'kie',
    description: 'Balanced KIE Flux Kontext image generation and editing.',
  },
  {
    value: 'kie_flux_kontext_max',
    label: 'KIE Flux Kontext Max',
    provider: 'kie',
    description: 'Highest-quality KIE Flux option for product and ad scenes.',
  },
  {
    value: 'nano_banana_pro',
    label: 'Nano Banana Pro',
    provider: 'fal',
    description: 'Legacy fal.ai Gemini 3 Pro Image route.',
  },
  {
    value: 'gpt_image_2',
    label: 'GPT Image 2',
    provider: 'fal',
    description: 'Legacy fal.ai OpenAI GPT Image 2 route.',
  },
];

const IMAGE_MODEL_VALUES = new Set<ImageModel>(IMAGE_MODEL_OPTIONS.map((option) => option.value));

export function normalizeImageModel(value: unknown): ImageModel {
  return typeof value === 'string' && IMAGE_MODEL_VALUES.has(value as ImageModel)
    ? (value as ImageModel)
    : DEFAULT_IMAGE_MODEL;
}

export function getImageModelOption(model: ImageModel): ImageModelOption {
  return IMAGE_MODEL_OPTIONS.find((option) => option.value === model) ?? IMAGE_MODEL_OPTIONS[0]!;
}

export function getImageModelProvider(model: ImageModel): ImageModelProvider {
  return getImageModelOption(model).provider;
}

export function getImageModelProviderLabel(provider: ImageModelProvider | undefined): string {
  if (provider === 'kie') return 'KIE.ai';
  if (provider === 'fal') return 'fal.ai';
  return 'Unknown provider';
}

export function getImageModelLabel(model: ImageModel | undefined): string {
  return model ? getImageModelOption(model).label : 'Unknown model';
}

export function isKieImageModel(model: ImageModel): boolean {
  return getImageModelProvider(model) === 'kie';
}

export function isFalImageModel(model: ImageModel): boolean {
  return getImageModelProvider(model) === 'fal';
}

export function isKieGpt4oModel(model: ImageModel): boolean {
  return model === 'kie_gpt4o';
}

export function isFalGptImage2Model(model: ImageModel): boolean {
  return model === 'gpt_image_2';
}

interface ModelStore {
  selectedModel: ImageModel;
  setSelectedModel: (model: ImageModel) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set) => ({
      selectedModel: DEFAULT_IMAGE_MODEL,
      setSelectedModel: (selectedModel) =>
        set({ selectedModel: normalizeImageModel(selectedModel) }),
    }),
    {
      name: 'image-model',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const state = persisted as Partial<ModelStore> | undefined;
        return {
          ...current,
          ...state,
          selectedModel: normalizeImageModel(state?.selectedModel),
        };
      },
    },
  ),
);
