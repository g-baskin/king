import type { ImagesRepository } from './imagesRepository';
import { createSupabaseServerClient } from './supabaseServer';
import type { ListImagesInput, ListImagesResult, WebImageRecord } from '../shared/images';
import type { Database } from '../shared/supabase';

type ImageRow = Database['public']['Tables']['images']['Row'];

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
  async list(input: ListImagesInput): Promise<ListImagesResult> {
    const supabase = createSupabaseServerClient();
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
