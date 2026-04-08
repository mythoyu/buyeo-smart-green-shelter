/**
 * 외부 연동용 백엔드 재기동 (절기 API와 동일하게 /api/v1/external 에만 등록)
 * POST /system/restart-backend
 */

import { FastifyInstance } from 'fastify';

import { ServiceContainer } from '../../../../core/container/ServiceContainer';
import { logInfo } from '../../../../logger';
import { triggerGracefulShutdown } from '../../../../shutdown/gracefulShutdownRegistry';
import {
  createSuccessResponse,
  HttpSystemError,
  handleHttpError,
} from '../../../../shared/utils/responseHelper';

export default async function systemRestartBackendExternalRoutes(app: FastifyInstance) {
  app.post(
    '/system/restart-backend',
    { preHandler: [app.requireAuth] },
    async (_request, reply) => {
      try {
        logInfo('[POST external/system/restart-backend] 요청');

        const serviceContainer = ServiceContainer.getInstance();
        const webSocketService = serviceContainer.getWebSocketService();
        webSocketService?.broadcastLog('info', 'system', '백엔드 서비스를 재시작합니다.');

        setTimeout(() => {
          try {
            triggerGracefulShutdown('api:restart-backend-external');
          } catch (error) {
            logInfo(`백엔드 재기동 실행 중 오류: ${error}`);
            // process.exit 금지(린트). 종료가 필요하면 상위 graceful shutdown 파이프라인이 처리한다.
            throw error;
          }
        }, 1000);

        return reply.send(
          createSuccessResponse('백엔드 재기동 요청이 접수되었습니다. 잠시 후 서비스가 재시작됩니다.'),
        );
      } catch {
        return handleHttpError(new HttpSystemError('백엔드 재기동 요청 처리 중 오류'), reply);
      }
    },
  );
}
