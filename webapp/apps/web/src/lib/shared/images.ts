export interface WebImageRecord {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  prompt: string;
  aspectRatio: string;
  width?: number;
  height?: number;
  mimeType?: string;
  createdAt: string;
  filename: string;
  workspaceId?: string;
}

export interface CreateUploadedImageInput {
  file: File;
  prompt: string;
  aspectRatio: string;
}

export interface CreateImageRecordInput {
  workspaceId: string;
  storageKey: string;
  publicUrl?: string | null;
  thumbnailUrl?: string | null;
  prompt: string;
  aspectRatio: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  filename: string;
}

export interface ListImagesInput {
  cursor?: string;
  limit?: number;
  workspaceId?: string;
}

export interface ListImagesResult {
  data: WebImageRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}
