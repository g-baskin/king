import type { ListImagesInput, ListImagesResult } from '../shared/images';

export interface WebKingApiOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class WebKingApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WebKingApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listImages(input: ListImagesInput = {}): Promise<ListImagesResult> {
    const params = new URLSearchParams();
    if (input.cursor) params.set('cursor', input.cursor);
    if (input.limit !== undefined) params.set('limit', String(input.limit));
    if (input.workspaceId) params.set('workspaceId', input.workspaceId);

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return this.request<ListImagesResult>(`/api/images${suffix}`);
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`King API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
