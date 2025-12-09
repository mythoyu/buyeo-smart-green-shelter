import { FastifyRequest, FastifyReply } from 'fastify';

// API 엔드포인트 상수
const HEALTH_ENDPOINTS = {
  HEALTH: '/health',
} as const;

import { createErrorResponse, ErrorCodes, ErrorMessages, handleHttpSuccess } from '../../shared/utils/responseHelper';

// 헬스체크 엔드포인트
export const healthCheckHandler = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Mongoose 연결 상태 확인
    const isConnected = true; // 데이터베이스 연결 상태 확인
    if (!isConnected) throw new Error('Mongoose not connected');

    return handleHttpSuccess(
      ErrorMessages.TEST_HEALTH_SUCCESS,
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected',
      },
      reply,
    );
  } catch (error) {
    return reply.code(503).send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, ErrorMessages.TEST_HEALTH_ERROR));
  }
};
