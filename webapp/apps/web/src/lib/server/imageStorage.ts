import { basename, extname } from 'node:path';
import { createSupabaseServerClient } from './supabaseServer';

export const IMAGE_BUCKET = 'images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 10;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export class ImageStorageError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ImageStorageError';
    this.status = status;
  }
}

function safeFilename(name: string): string {
  const base = basename(name).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  const extension = extname(base).toLowerCase();
  const stem = base.slice(0, extension ? -extension.length : undefined).slice(0, 72) || 'image';
  return `${stem}${extension || '.png'}`;
}

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ImageStorageError(400, 'Only JPEG, PNG, WebP, and GIF uploads are supported');
  }

  if (file.size <= 0) {
    throw new ImageStorageError(400, 'Image file is empty');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageStorageError(400, 'Image file must be 10MB or smaller');
  }
}

export function buildWorkspaceImageStorageKey(workspaceId: string, filename: string): string {
  return `${workspaceId}/${crypto.randomUUID()}-${safeFilename(filename)}`;
}

export async function uploadWorkspaceImage(input: {
  workspaceId: string;
  file: File;
}): Promise<{ storageKey: string; filename: string; mimeType: string }> {
  validateImageFile(input.file);

  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ImageStorageError(503, 'Supabase is not configured');

  const filename = safeFilename(input.file.name || 'image.png');
  const storageKey = buildWorkspaceImageStorageKey(input.workspaceId, filename);
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(storageKey, input.file, {
    contentType: input.file.type,
    upsert: false,
  });

  if (error) throw new ImageStorageError(500, error.message);
  return { storageKey, filename, mimeType: input.file.type };
}

export async function deleteWorkspaceImage(storageKey: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ImageStorageError(503, 'Supabase is not configured');

  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([storageKey]);
  if (error) throw new ImageStorageError(500, error.message);
}

export async function createSignedImageUrl(storageKey: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new ImageStorageError(503, 'Supabase is not configured');

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS);

  if (error) throw new ImageStorageError(500, error.message);
  return data.signedUrl;
}
