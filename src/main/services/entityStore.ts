import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { getEntityJsonPath, getEntityImagesDir } from './paths';
import { readJson, writeJsonAtomic, withJsonLock } from './atomicJson';

export interface StoredEntity {
  id: string;
  name: string;
  referenceImages: string[];
  thumbnailUrl: string | null;
  createdAt: string;
  productType?: string;
  primaryReferenceIndex?: number;
  workspaceId?: string;
}

interface EntityStore {
  entities: StoredEntity[];
}

function readStore(entityType: string): EntityStore {
  return readJson<EntityStore>(getEntityJsonPath(entityType), { entities: [] });
}

export function listEntities(entityType: string, workspaceId?: string): StoredEntity[] {
  const store = readStore(entityType);
  const filtered = workspaceId
    ? store.entities.filter((entity) => (entity.workspaceId ?? 'workspace-ugc') === workspaceId)
    : store.entities;
  return [...filtered]
    .map((entity) => ({
      ...entity,
      primaryReferenceIndex:
        typeof entity.primaryReferenceIndex === 'number' &&
        entity.primaryReferenceIndex >= 0 &&
        entity.primaryReferenceIndex < entity.referenceImages.length
          ? entity.primaryReferenceIndex
          : 0,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getEntity(entityType: string, id: string): StoredEntity | undefined {
  const store = readStore(entityType);
  return store.entities.find((e) => e.id === id);
}

export function saveEntityImages(
  entityType: string,
  files: { name: string; buffer: Buffer }[],
): string[] {
  const dir = getEntityImagesDir(entityType);
  const urls: string[] = [];

  for (const file of files) {
    const ext = extname(file.name) || '.png';
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(dir, filename);
    writeFileSync(filePath, file.buffer);
    urls.push(`local-file:///entities/${entityType}/${filename}`);
  }

  return urls;
}

export async function addEntity(
  entityType: string,
  name: string,
  referenceImages: string[],
  productType?: string,
  primaryReferenceIndex?: number,
  workspaceId?: string,
): Promise<StoredEntity> {
  const path = getEntityJsonPath(entityType);
  return withJsonLock(path, () => {
    const store = readStore(entityType);
    const clampedPrimaryIndex =
      referenceImages.length === 0
        ? 0
        : Math.max(0, Math.min(primaryReferenceIndex ?? 0, referenceImages.length - 1));

    const entity: StoredEntity = {
      id: randomUUID(),
      name,
      referenceImages,
      thumbnailUrl: referenceImages[clampedPrimaryIndex] ?? null,
      createdAt: new Date().toISOString(),
      primaryReferenceIndex: clampedPrimaryIndex,
      ...(productType ? { productType } : {}),
      workspaceId,
    };
    store.entities.push(entity);
    writeJsonAtomic(path, store);
    return entity;
  });
}

export async function updateEntity(
  entityType: string,
  id: string,
  name: string,
  referenceImages: string[],
  productType?: string,
  primaryReferenceIndex?: number,
): Promise<StoredEntity | null> {
  const path = getEntityJsonPath(entityType);
  return withJsonLock(path, () => {
    const store = readStore(entityType);
    const index = store.entities.findIndex((e) => e.id === id);
    const existing = index === -1 ? undefined : store.entities[index];
    if (!existing) return null;

    const currentPrimaryIndex =
      typeof existing.primaryReferenceIndex === 'number' ? existing.primaryReferenceIndex : 0;
    const targetPrimaryIndex =
      typeof primaryReferenceIndex === 'number' ? primaryReferenceIndex : currentPrimaryIndex;
    const clampedPrimaryIndex =
      referenceImages.length === 0
        ? 0
        : Math.max(0, Math.min(targetPrimaryIndex, referenceImages.length - 1));

    const updated: StoredEntity = {
      ...existing,
      name,
      referenceImages,
      thumbnailUrl: referenceImages[clampedPrimaryIndex] ?? null,
      primaryReferenceIndex: clampedPrimaryIndex,
      ...(productType !== undefined ? { productType } : {}),
    };
    store.entities[index] = updated;
    writeJsonAtomic(path, store);
    return updated;
  });
}

export async function deleteEntity(
  entityType: string,
  id: string,
  workspaceId?: string,
): Promise<boolean> {
  const path = getEntityJsonPath(entityType);
  return withJsonLock(path, () => {
    const store = readStore(entityType);
    const entity = store.entities.find(
      (e) => e.id === id && (e.workspaceId ?? 'workspace-ugc') === (workspaceId ?? 'workspace-ugc'),
    );
    if (!entity) return false;

    // Delete reference image files
    const dir = getEntityImagesDir(entityType);
    for (const imageUrl of entity.referenceImages) {
      // Extract filename from local-file:///entities/<type>/<filename>
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1];
      if (!filename) continue;
      const filePath = join(dir, filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }

    store.entities = store.entities.filter(
      (e) => !(e.id === id && (e.workspaceId ?? 'workspace-ugc') === (workspaceId ?? 'workspace-ugc')),
    );
    writeJsonAtomic(path, store);
    return true;
  });
}
