import type { ListImagesInput, ListImagesResult, WebImageRecord } from '../shared/images';

const placeholderImages = [
  {
    id: 'placeholder-hero-001',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=480&q=80',
    prompt: 'High-converting hero product shot with bold color contrast and clean ecommerce framing.',
    aspectRatio: '1:1',
    width: 1200,
    height: 1200,
    mimeType: 'image/jpeg',
    createdAt: '2026-06-05T00:00:00.000Z',
    filename: 'placeholder-hero-001.jpg',
    workspaceId: 'demo',
  },
  {
    id: 'placeholder-ugc-002',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=480&q=80',
    prompt: 'Lifestyle creative for social ads with creator-led styling and scroll-stopping composition.',
    aspectRatio: '4:5',
    width: 960,
    height: 1200,
    mimeType: 'image/jpeg',
    createdAt: '2026-06-05T00:01:00.000Z',
    filename: 'placeholder-ugc-002.jpg',
    workspaceId: 'demo',
  },
  {
    id: 'placeholder-story-003',
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=360&q=80',
    prompt: 'Vertical story creative with premium editorial styling and clear product focus.',
    aspectRatio: '9:16',
    width: 900,
    height: 1600,
    mimeType: 'image/jpeg',
    createdAt: '2026-06-05T00:02:00.000Z',
    filename: 'placeholder-story-003.jpg',
    workspaceId: 'demo',
  },
] satisfies WebImageRecord[];

export function listPlaceholderImages(input: ListImagesInput = {}): ListImagesResult {
  const limit = Math.max(1, Math.min(input.limit ?? placeholderImages.length, 100));
  const filtered = input.workspaceId
    ? placeholderImages.filter((image) => image.workspaceId === input.workspaceId)
    : placeholderImages;

  return {
    data: filtered.slice(0, limit),
    nextCursor: null,
    hasMore: false,
  };
}
