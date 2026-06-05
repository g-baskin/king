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
