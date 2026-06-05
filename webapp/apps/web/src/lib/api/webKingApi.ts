import type {
  CreateUploadedImageInput,
  ListImagesInput,
  ListImagesResult,
  WebImageRecord,
} from '../shared/images';

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

  async createImage(input: CreateUploadedImageInput): Promise<WebImageRecord> {
    const form = new FormData();
    form.set('file', input.file);
    form.set('prompt', input.prompt);
    form.set('aspectRatio', input.aspectRatio);

    return this.requestForm<WebImageRecord>('/api/images', form);
  }

  async listImages(input: ListImagesInput = {}): Promise<ListImagesResult> {
    const params = new URLSearchParams();
    if (input.cursor) params.set('cursor', input.cursor);
    if (input.limit !== undefined) params.set('limit', String(input.limit));
    if (input.workspaceId) params.set('workspaceId', input.workspaceId);

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return this.request<ListImagesResult>(`/api/images${suffix}`);
  }

  async requestForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body }, false);
  }

  async request<T>(path: string, init: RequestInit = {}, useJsonHeaders = true): Promise<T> {
    const requestInit: RequestInit = useJsonHeaders
      ? {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init.headers,
          },
        }
      : init;

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `King API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
