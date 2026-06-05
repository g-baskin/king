import type { ImagesRepository } from './imagesRepository';
import { createSupabaseServerClient } from './supabaseServer';
import type {
  CreateImageRecordInput,
  ListImagesInput,
  ListImagesResult,
  WebImageRecord,
} from '../shared/images';
import type { Database } from '../shared/supabase';

type ImageRow = Database['public']['Tables']['images']['Row'];

export interface ImageAssetRecord {
  storageKey: string;
  publicUrl: string | null;
}

function mapImageRow(row: ImageRow): WebImageRecord {
  return {
    id: row.id,
    url: row.public_url ?? `/api/images/${row.id}/asset`,
    thumbnailUrl: row.thumbnail_url,
    prompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    ...(row.width !== null ? { width: row.width } : {}),
    ...(row.height !== null ? { height: row.height } : {}),
    ...(row.mime_type !== null ? { mimeType: row.mime_type } : {}),
    createdAt: row.created_at,
    filename: row.filename,
    workspaceId: row.workspace_id,
  };
}

export class SupabaseImagesRepository implements ImagesRepository {
  async getAssetById(id: string): Promise<ImageAssetRecord | null> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('images')
      .select('storage_key, public_url')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load image asset: ${error.message}`);
    }

    const row = data as { storage_key: string; public_url: string | null } | null;
    return row ? { storageKey: row.storage_key, publicUrl: row.public_url } : null;
  }

  async create(input: CreateImageRecordInput): Promise<WebImageRecord> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('images')
      .insert({
        workspace_id: input.workspaceId,
        storage_key: input.storageKey,
        public_url: input.publicUrl ?? null,
        thumbnail_url: input.thumbnailUrl ?? null,
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        width: input.width ?? null,
        height: input.height ?? null,
        mime_type: input.mimeType ?? null,
        filename: input.filename,
      })
      .select(
        'id, workspace_id, storage_key, public_url, thumbnail_url, prompt, aspect_ratio, width, height, mime_type, filename, created_at',
      )
      .single();

    if (error) {
      throw new Error(`Failed to create image: ${error.message}`);
    }

    return mapImageRow(data as ImageRow);
  }

  async getById(id: string): Promise<WebImageRecord | null> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('images')
      .select(
        'id, workspace_id, storage_key, public_url, thumbnail_url, prompt, aspect_ratio, width, height, mime_type, filename, created_at',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load image: ${error.message}`);
    }

    return data ? mapImageRow(data as ImageRow) : null;
  }

  async list(input: ListImagesInput): Promise<ListImagesResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const limit = Math.max(1, Math.min(input.limit ?? 24, 100));
    let query = supabase
      .from('images')
      .select(
        'id, workspace_id, storage_key, public_url, thumbnail_url, prompt, aspect_ratio, width, height, mime_type, filename, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (input.workspaceId) query = query.eq('workspace_id', input.workspaceId);
    if (input.cursor) query = query.lt('created_at', input.cursor);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list images: ${error.message}`);
    }

    const rows = (data ?? []) as ImageRow[];
    const lastRow = rows.at(-1);

    return {
      data: rows.map(mapImageRow),
      nextCursor: rows.length === limit ? lastRow?.created_at ?? null : null,
      hasMore: rows.length === limit,
    };
  }
}
