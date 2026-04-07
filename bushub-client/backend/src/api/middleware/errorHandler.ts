import { FastifyRequest, FastifyReply } from 'fastify';

import { logInfo, logError } from '../../logger';
import { createErrorResponse, ErrorCodes, AppError } from '../../shared/utils/responseHelper';

// Unhandled 에러 이벤트 처리
export const setupErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    logInfo(`Unhandled Rejection: ${reason}`);
  });

  process.on('uncaughtException', (error) => {
    logError(`Uncaught Exception: ${error.message}`);
    logInfo(`Uncaught Exception: ${error.message}`);
    // 심각한 에러이므로 프로세스 종료 (필요한 경우에만)
    // process.exit(1);
    // throw error; // 이 줄을 주석 처리하여 errorHandler가 처리할 수 있도록 함
  });
};

export async function errorHandler(error: Error, _request: FastifyRequest, reply: FastifyReply) {
  // 커스텀 에러 클래스 처리
  if (error instanceof AppError) {
    logInfo(`애플리케이션 에러 [${error.code}]: ${error.message}`);

    return reply.code(error.statusCode).send(createErrorResponse(error.code, error.message));
  }

  // 일반 에러 처리
  logInfo(`요청 처리 중 오류 발생: ${error.message}`);

  return reply.code(500).send(createErrorResponse(ErrorCodes.INTERNAL_ERROR, error.message));
}
