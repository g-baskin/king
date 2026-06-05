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
