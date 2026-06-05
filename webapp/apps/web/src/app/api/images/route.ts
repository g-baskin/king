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
  if (workspaceId) input.workspaceId = workspaceId;

  const repository = createImagesRepository();
  return Response.json(await repository.list(input));
}
