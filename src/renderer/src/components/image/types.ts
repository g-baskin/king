import type { ImageModel, ImageModelProvider } from '@/stores/modelStore';

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  prompt: string;
  aspectRatio: string;
  createdAt: string;
  workspaceId?: string;
  modelProvider?: ImageModelProvider;
  modelVariant?: ImageModel;
  effectiveModelVariant?: ImageModel;
}
