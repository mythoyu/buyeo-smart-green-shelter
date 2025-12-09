import { FastifyRequest, FastifyReply } from 'fastify';

import { ServiceContainer } from '../../core/container/ServiceContainer';
import {
  HttpAuthenticationError,
  HttpAuthorizationError,
  handleHttpError,
  ErrorMessages,
} from '../../shared/utils/responseHelper';

// API 키 인증 미들웨어
export const authenticateApiKey = async (request: FastifyRequest, reply: FastifyReply) => {
  // OPTIONS 요청은 인증을 건너뜀 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return handleHttpError(new HttpAuthenticationError(ErrorMessages.AUTH_TOKEN_REQUIRED), reply);
  }

  // Bearer 토큰 형식 검증
  if (!authHeader.startsWith('Bearer ')) {
    return handleHttpError(new HttpAuthenticationError('Bearer 토큰 형식이 필요합니다.'), reply);
  }

  const apiKeyString = authHeader.replace(/^Bearer\s*/i, '');

  // ServiceContainer를 통해 API 키 서비스 사용
  const serviceContainer = ServiceContainer.getInstance();
  const apiKeyService = serviceContainer.getApiKeyService();

  // 메모리 기반 API 키 검증 (빠른 검증)
  const apiKey = apiKeyService.validateApiKeyFromMemory(apiKeyString);

  // 메모리에 없으면 DB에서 검증 (fallback)
  if (!apiKey) {
    const dbApiKey = await apiKeyService.validateApiKey(apiKeyString);
    if (!dbApiKey) {
      return handleHttpError(new HttpAuthenticationError(ErrorMessages.INVALID_TOKEN), reply);
    }
    (request as any).apiKey = dbApiKey;
  } else {
    // API 키 정보를 요청 객체에 저장
    (request as any).apiKey = apiKey;
  }

  // API 키 만료 검증
  const currentApiKey = (request as any).apiKey;
  if (currentApiKey.expiresAt && new Date() > new Date(currentApiKey.expiresAt)) {
    return handleHttpError(new HttpAuthenticationError('만료된 API Key입니다.'), reply);
  }

  // API 키 상태 검증
  if (currentApiKey.status !== 'active') {
    return handleHttpError(new HttpAuthenticationError('비활성화된 API Key입니다.'), reply);
  }

  // API 키 타입별 경로 제한
  const requestPath = request.url;

  // universal 타입은 모든 경로 접근 가능
  if (currentApiKey.type === 'universal') {
    return; // 모든 경로 허용
  }

  // 외부용 API 키는 내부 경로 접근 제한
  if (currentApiKey.type === 'external' && requestPath.startsWith('/api/v1/internal/')) {
    return handleHttpError(new HttpAuthorizationError(ErrorMessages.EXTERNAL_API_FORBIDDEN), reply);
  }

  // 내부용 API 키는 외부 경로 접근 제한
  if (currentApiKey.type === 'internal' && requestPath.startsWith('/api/v1/external/')) {
    return handleHttpError(new HttpAuthorizationError('내부용 API 키로는 외부 경로에 접근할 수 없습니다.'), reply);
  }
};
