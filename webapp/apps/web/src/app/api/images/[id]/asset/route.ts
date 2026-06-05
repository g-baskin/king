import { WebAuthError, requireWorkspaceContext } from '@/lib/server/authContext';
import { getSupabasePublicEnv } from '@/lib/server/env';
import { ImageStorageError, createSignedImageUrl } from '@/lib/server/imageStorage';
import { SupabaseImagesRepository } from '@/lib/server/supabaseImagesRepository';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!getSupabasePublicEnv()) {
    return Response.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    await requireWorkspaceContext();
    const { id } = await context.params;
    const repository = new SupabaseImagesRepository();
    const asset = await repository.getAssetById(id);

    if (!asset) {
      return Response.json({ error: 'Image not found' }, { status: 404 });
    }

    if (asset.publicUrl) {
      return Response.redirect(asset.publicUrl, 307);
    }

    return Response.redirect(await createSignedImageUrl(asset.storageKey), 307);
  } catch (error) {
    if (error instanceof WebAuthError || error instanceof ImageStorageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
