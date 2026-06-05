import { WebAuthError, requireWorkspaceContext } from '@/lib/server/authContext';
import { getSupabasePublicEnv } from '@/lib/server/env';
import {
  ImageStorageError,
  deleteWorkspaceImage,
  uploadWorkspaceImage,
} from '@/lib/server/imageStorage';
import { createImagesRepository } from '@/lib/server/imagesRepository';
import type { ListImagesInput } from '@/lib/shared/images';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const input: ListImagesInput = {};
  const cursor = url.searchParams.get('cursor');
  const limit = Number(url.searchParams.get('limit') ?? '');
  const workspaceId = url.searchParams.get('workspaceId');

  if (cursor) input.cursor = cursor;
  if (Number.isFinite(limit) && limit > 0) input.limit = limit;

  try {
    if (getSupabasePublicEnv()) {
      const workspace = await requireWorkspaceContext(workspaceId ?? undefined);
      input.workspaceId = workspace.workspaceId;
    } else if (workspaceId) {
      input.workspaceId = workspaceId;
    }

    const repository = createImagesRepository();
    return Response.json(await repository.list(input));
  } catch (error) {
    if (error instanceof WebAuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!getSupabasePublicEnv()) {
    return Response.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  try {
    const workspace = await requireWorkspaceContext();
    const form = await request.formData();
    const file = form.get('file');
    const prompt = String(form.get('prompt') ?? '').trim();
    const aspectRatio = String(form.get('aspectRatio') ?? '').trim();

    if (!(file instanceof File)) {
      return Response.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!prompt || !aspectRatio) {
      return Response.json({ error: 'Prompt and aspect ratio are required' }, { status: 400 });
    }

    const upload = await uploadWorkspaceImage({ workspaceId: workspace.workspaceId, file });
    const repository = createImagesRepository();

    if (!repository.create) {
      return Response.json({ error: 'Image creation is not available' }, { status: 503 });
    }

    try {
      const image = await repository.create({
        workspaceId: workspace.workspaceId,
        storageKey: upload.storageKey,
        prompt,
        aspectRatio,
        mimeType: upload.mimeType,
        filename: upload.filename,
      });

      return Response.json(image, { status: 201 });
    } catch (error) {
      await deleteWorkspaceImage(upload.storageKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof WebAuthError || error instanceof ImageStorageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
