/**
 * System Polling API Routes
 * 시스템 폴링 관련 API 엔드포인트
 *
 * 주요 기능:
 * 1. 폴링 데이터 동기화
 * 2. 폴링 상태 조회
 * 3. 수동 폴링 실행
 * 4. 폴링 간격 설정 및 조회
 */

import { FastifyInstance } from 'fastify';

import { ILogger } from '../../../../core/interfaces/ILogger';

// 폴링 데이터 동기화 요청 타입
interface SyncPollingDataRequest {
  Body: {
    deviceId: string;
    unitId: string;
    deviceType: string;
    forceSync?: boolean;
  };
}

// 수동 폴링 실행 요청 타입
interface ExecutePollingRequest {
  Body: {
    deviceId?: string;
    unitId?: string;
    deviceType?: string;
    allDevices?: boolean;
  };
}

// 폴링 상태 조회 요청 타입
interface GetPollingStatusRequest {
  Querystring: {
    deviceId?: string;
    unitId?: string;
    deviceType?: string;
  };
}

export default async function systemPollingRoutes(fastify: FastifyInstance) {
  const logger: ILogger = fastify.log;

  // ServiceContainer에서 서비스 가져오기
  const { serviceContainer } = fastify;
  const dataSyncService = serviceContainer.getDataSyncService();
  const modbusPollerService = serviceContainer.getUnifiedModbusPollerService();

  /**
   * GET /system/polling/state
   * 폴링 상태 조회
   */
  fastify.get(
    '/system/polling/state',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  pollingEnabled: { type: 'boolean' },
                  applyInProgress: { type: 'boolean' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // logInfo(`[System Polling API] 폴링 상태 조회 요청`);

        const systemService = serviceContainer.getSystemService();
        const pollingState = await systemService.getPollingState(true);

        if (!pollingState) {
          return (reply as any).code(500).send({
            success: false,
            message: '폴링 상태 초기화에 실패했습니다',
          });
        }

        return reply.send({
          success: true,
          data: {
            pollingEnabled: pollingState.pollingEnabled,
            applyInProgress: pollingState.applyInProgress,
          },
        });
      } catch (error) {
        logger.error(`[System Polling API] 폴링 상태 조회 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '내부 서버 오류',
          error: String(error),
        });
      }
    },
  );

  /**
   * POST /system/polling
   * 폴링 ON/OFF (간소화됨)
   */
  fastify.post(
    '/system/polling',
    {
      schema: {
        body: {
          type: 'object',
          required: ['pollingEnabled'],
          properties: {
            pollingEnabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  pollingEnabled: { type: 'boolean' },
                  applyInProgress: { type: 'boolean' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        logger.warn(`[System Polling API] POST /system/polling 요청 수신`);
        logger.warn(`[System Polling API] 요청 본문: ${JSON.stringify(request.body)}`);

        const { pollingEnabled } = request.body as { pollingEnabled: boolean };

        if (typeof pollingEnabled !== 'boolean') {
          logger.error(`[System Polling API] 잘못된 타입: ${typeof pollingEnabled}`);
          return (reply as any).code(400).send({
            success: false,
            message: 'pollingEnabled는 boolean 값이어야 합니다',
          });
        }

        logger.warn(`[System Polling API] 폴링 상태 변경 요청: ${pollingEnabled ? '시작' : '중지'}`);

        const systemService = serviceContainer.getSystemService();

        // 현재 상태 확인 (없으면 자동 초기화)
        const currentState = await systemService.getPollingState(true);
        if (!currentState) {
          return (reply as any).code(500).send({
            success: false,
            message: '시스템 상태 초기화에 실패했습니다',
          });
        }

        // Data 적용 중인지 확인
        if (currentState.applyInProgress) {
          return (reply as any).code(409).send({
            success: false,
            message: 'Data 적용 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.',
          });
        }

        // 폴링 상태 업데이트
        const updated = await systemService.updatePollingState(pollingEnabled);
        if (!updated?.runtime) {
          return (reply as any).code(500).send({
            success: false,
            message: '폴링 상태 업데이트에 실패했습니다',
          });
        }

        // 실제 폴링 시작/중지
        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        if (pollingService) {
          if (pollingEnabled) {
            await pollingService.startAllSNGILPolling();
            logger.info(`[System Polling API] 폴링 시작 완료`);

            // 웹소켓으로 폴링 시작 로그 전송
            const webSocketService = serviceContainer.getWebSocketService();
            webSocketService?.broadcastLog('info', 'system', '폴링 ON');
          } else {
            pollingService.stopAllPolling();
            logger.info(`[System Polling API] 폴링 중지 완료`);

            const modbusService = serviceContainer.getUnifiedModbusService();
            modbusService?.clearQueue();
            logger.info(`[System Polling API] 모드버스 명령 큐 초기화 완료`);

            // 웹소켓으로 폴링 중지 로그 전송
            const webSocketService = serviceContainer.getWebSocketService();
            webSocketService?.broadcastLog('info', 'system', '폴링 OFF');
          }
        }

        logger.info(`[System Polling API] 폴링 상태 변경 완료: ${pollingEnabled ? '시작' : '중지'}`);

        const response = {
          success: true,
          data: {
            pollingEnabled: updated.runtime?.pollingEnabled,
            applyInProgress: updated.runtime?.applyInProgress,
          },
          message: `폴링이 ${pollingEnabled ? '시작' : '중지'}되었습니다`,
        };

        logger.warn(`[System Polling API] 응답 전송: ${JSON.stringify(response)}`);
        return reply.send(response);
      } catch (error) {
        logger.error(`[System Polling API] 폴링 상태 변경 오류: ${error}`);
        return (reply as any).code(500).send({
          success: false,
          message: '폴링 상태 변경 중 오류가 발생했습니다',
        });
      }
    },
  );
}
