import { FastifyRequest, FastifyReply } from 'fastify';

import { HttpAuthenticationError, HttpAuthorizationError } from '../../shared/utils/responseHelper';
import { hasPermission, ApiKey } from '../../types';

// 권한 검증 미들웨어
export const requirePermission = (permission: string) => {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const apiKey = (request as any).apiKey as ApiKey;

    if (!apiKey) {
      throw new HttpAuthenticationError('인증이 필요합니다.');
    }

    if (!hasPermission(apiKey, permission)) {
      throw new HttpAuthorizationError('권한이 없습니다.');
    }
  };
};
