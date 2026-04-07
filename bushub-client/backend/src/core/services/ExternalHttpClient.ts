import { setTimeout as delay } from 'timers/promises';

import { logInfo } from '../../logger';

export interface HttpRequestOptions {
  timeoutMs: number;
  retries: number;
  backoffMs: number;
  headers?: Record<string, string>;
}

export class ExternalHttpClient {
  async getJson<T>(
    url: string,
    options: HttpRequestOptions,
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
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
        const contentType = res.headers.get('content-type') || '';
        logInfo(`[ExternalHttpClient] GET ${url} -> ${res.status} (${latency}ms), Content-Type: ${contentType}`);

        if (!res.ok) {
          logInfo(`[ExternalHttpClient] HTTP 에러 응답: ${res.status} ${res.statusText}`);
          return { ok: false, status: res.status, error: `HTTP ${res.status} ${res.statusText}` };
        }

        // Content-Type 확인 후 적절한 방식으로 읽기
        const isJson = contentType.includes('application/json');
        let data: any;

        if (isJson) {
          // JSON인 경우에만 json() 호출
          try {
            data = (await res.json()) as T;
          } catch (jsonError) {
            // JSON 파싱 실패 시 텍스트로 처리
            const text = await res.text();
            logInfo(
              `[ExternalHttpClient] JSON 파싱 실패, 텍스트로 처리 (Content-Type: ${contentType}, 길이: ${text.length})`,
            );
            data = {
              contentType,
              content: text.substring(0, 5000), // 처음 5000자만 저장 (너무 큰 응답 방지)
              length: text.length,
            } as T;
          }
        } else {
          // JSON이 아닌 경우 바로 text() 호출 (HTML, XML, plain text 등)
          const text = await res.text();
          logInfo(
            `[ExternalHttpClient] 비JSON 콘텐츠를 텍스트로 처리 (Content-Type: ${contentType}, 길이: ${text.length})`,
          );
          data = {
            contentType,
            content: text.substring(0, 5000), // 처음 5000자만 저장 (너무 큰 응답 방지)
            length: text.length,
          } as T;
        }

        return { ok: true, status: res.status, data };
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        // 에러 타입별 메시지 생성
        let errorMessage = '알 수 없는 오류';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = '요청 타임아웃';
          } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            errorMessage = '연결 거부 또는 네트워크 오류';
          } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            errorMessage = 'DNS 해석 실패';
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = String(error);
        }

        logInfo(`[ExternalHttpClient] 시도 ${attempt + 1} 실패: ${errorMessage}`);
        if (attempt === retries) break;
        await delay(backoffMs * Math.pow(2, attempt));
        attempt += 1;
      }
    }

    const finalErrorMessage =
      lastError instanceof Error
        ? lastError.name === 'AbortError'
          ? '요청 타임아웃'
          : lastError.message.includes('fetch failed') || lastError.message.includes('ECONNREFUSED')
          ? '연결 거부 또는 네트워크 오류'
          : lastError.message.includes('ENOTFOUND') || lastError.message.includes('getaddrinfo')
          ? 'DNS 해석 실패'
          : lastError.message
        : String(lastError);

    logInfo(`[ExternalHttpClient] GET ${url} failed after ${retries + 1} attempts: ${finalErrorMessage}`);
    return { ok: false, status: 0, error: finalErrorMessage };
  }
}
