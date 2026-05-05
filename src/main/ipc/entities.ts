import {
  listEntities,
  addEntity,
  updateEntity,
  deleteEntity,
  saveEntityImages,
} from '../services/entityStore';
import { secureHandle } from './validateSender';

const VALID_TYPES = ['characters', 'products'];

function validateType(entityType: string): boolean {
  return VALID_TYPES.includes(entityType);
}

export function registerEntityHandlers(): void {
  secureHandle('entities:list', async (_event, entityType: string, workspaceId?: string) => {
    if (!validateType(entityType)) return [];
    return listEntities(entityType, workspaceId);
  });

  secureHandle(
    'entities:create',
    async (
      _event,
      entityType: string,
      data: {
        name: string;
        files: { name: string; buffer: Uint8Array }[];
        productType?: string;
        primaryReferenceIndex?: number;
        workspaceId?: string;
      },
    ) => {
      if (!validateType(entityType)) throw new Error('Invalid entity type');

      const buffers = data.files.map((f) => ({
        name: f.name,
        buffer: Buffer.from(f.buffer),
      }));
      const imageUrls = saveEntityImages(entityType, buffers);
      return await addEntity(
        entityType,
        data.name,
        imageUrls,
        data.productType,
        data.primaryReferenceIndex,
        data.workspaceId,
      );
    },
  );

  secureHandle(
    'entities:update',
    async (
      _event,
      entityType: string,
      id: string,
      data: {
        name: string;
        existingImages: string[];
        newFiles: { name: string; buffer: Uint8Array }[];
        productType?: string;
        primaryReferenceIndex?: number;
      },
    ) => {
      if (!validateType(entityType)) throw new Error('Invalid entity type');

      let newUrls: string[] = [];
      if (data.newFiles.length > 0) {
        const buffers = data.newFiles.map((f) => ({
          name: f.name,
          buffer: Buffer.from(f.buffer),
        }));
        newUrls = saveEntityImages(entityType, buffers);
      }

      const allImages = [...data.existingImages, ...newUrls];
      const updated = await updateEntity(
        entityType,
        id,
        data.name,
        allImages,
        data.productType,
        data.primaryReferenceIndex,
      );
      if (!updated) throw new Error('Entity not found');
      return updated;
    },
  );

  secureHandle(
    'entities:delete',
    async (_event, entityType: string, id: string, workspaceId?: string) => {
      if (!validateType(entityType)) return { success: false };
      const success = await deleteEntity(entityType, id, workspaceId);
      return { success };
    },
  );
}
