import { setTimeout as delay } from 'timers/promises';

import { logInfo } from '../../logger';

export interface HttpRequestOptions {
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  headers?: Record<string, string>;
}

export class ExternalHttpClient {
  async getJson<T>(url: string, options: HttpRequestOptions): Promise<{ ok: boolean; status: number; data?: T }> {
    const { timeoutMs, retries, backoffMs, headers } = options;

    let attempt = 0;
    let lastError: any;

    while (attempt <= retries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const start = Date.now();
      try {
        const init: RequestInit = {
          method: 'GET',
          signal: controller.signal,
        };
        if (headers) {
          init.headers = headers as HeadersInit;
        }
        const res = await fetch(url, init);
        clearTimeout(timeout);

        const latency = Date.now() - start;
        logInfo(`[ExternalHttpClient] GET ${url} -> ${res.status} (${latency}ms)`);

        if (!res.ok) {
          logInfo(`[ExternalHttpClient] HTTP 에러 응답: ${res.status} ${res.statusText}`);
          return { ok: false, status: res.status };
        }

        const data = (await res.json()) as T;
        return { ok: true, status: res.status, data };
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        logInfo(
          `[ExternalHttpClient] 시도 ${attempt + 1} 실패: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (attempt === retries) break;
        await delay(backoffMs * Math.pow(2, attempt));
        attempt += 1;
      }
    }

    logInfo(`[ExternalHttpClient] GET ${url} failed after ${retries + 1} attempts: ${lastError}`);
    return { ok: false, status: 0 };
  }
}
