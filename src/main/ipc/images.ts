import { randomUUID } from 'crypto';
import {
  listImages,
  addImage,
  deleteImage,
  getImage,
  type StoredImageModelProvider,
  type StoredImageModelVariant,
} from '../services/imageStore';
import { downloadAndSaveImage, deleteImageFile } from '../services/fileManager';
import { secureHandle } from './validateSender';

const IMAGE_MODEL_PROVIDERS = new Set<StoredImageModelProvider>(['kie', 'fal']);
const IMAGE_MODEL_VARIANTS = new Set<StoredImageModelVariant>([
  'kie_auto',
  'kie_gpt4o',
  'kie_flux_kontext_pro',
  'kie_flux_kontext_max',
  'nano_banana_pro',
  'gpt_image_2',
]);

function normalizeProvider(value: unknown): StoredImageModelProvider | undefined {
  return typeof value === 'string' && IMAGE_MODEL_PROVIDERS.has(value as StoredImageModelProvider)
    ? (value as StoredImageModelProvider)
    : undefined;
}

function normalizeVariant(value: unknown): StoredImageModelVariant | undefined {
  return typeof value === 'string' && IMAGE_MODEL_VARIANTS.has(value as StoredImageModelVariant)
    ? (value as StoredImageModelVariant)
    : undefined;
}

export function registerImageHandlers(): void {
  secureHandle(
    'images:list',
    async (_event, cursor?: string, limit?: number, workspaceId?: string) => {
      return listImages(cursor, limit, workspaceId);
    },
  );

  secureHandle(
    'images:save',
    async (
      _event,
      data: {
        url: string;
        prompt: string;
        aspectRatio: string;
        workspaceId?: string;
        modelProvider?: StoredImageModelProvider;
        modelVariant?: StoredImageModelVariant;
        effectiveModelVariant?: StoredImageModelVariant;
      },
    ) => {
      const { filename, localUrl } = await downloadAndSaveImage(data.url);
      const modelProvider = normalizeProvider(data.modelProvider);
      const modelVariant = normalizeVariant(data.modelVariant);
      const effectiveModelVariant = normalizeVariant(data.effectiveModelVariant);
      const image = await addImage({
        id: randomUUID(),
        url: localUrl,
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        createdAt: new Date().toISOString(),
        filename,
        workspaceId: data.workspaceId,
        ...(modelProvider ? { modelProvider } : {}),
        ...(modelVariant ? { modelVariant } : {}),
        ...(effectiveModelVariant ? { effectiveModelVariant } : {}),
      });
      return image;
    },
  );

  secureHandle('images:delete', async (_event, id: string) => {
    const image = await getImage(id);
    if (image) {
      deleteImageFile(image.filename);
    }
    const success = await deleteImage(id);
    return { success };
  });
}
