import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ServiceContainer } from '../../../../core/container/ServiceContainer';
import { logError } from '../../../../logger';
import { createSuccessResponse } from '../../../../shared/utils/responseHelper';

export default async function systemDdcTimeRoutes(fastify: FastifyInstance) {
  // 🕐 DDC 시간 설정 조회
  fastify.get(
    '/system/ddc-time',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  ddcTime: {
                    type: 'object',
                    properties: {
                      year: { type: 'number' },
                      month: { type: 'number' },
                      day: { type: 'number' },
                      dow: { type: 'number' },
                      hour: { type: 'number' },
                      minute: { type: 'number' },
                      second: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // ServiceContainer에서 SystemService 가져오기
        const serviceContainer = ServiceContainer.getInstance();
        const systemService = serviceContainer.getSystemService();

        // 🆕 실제 클라이언트 정보 조회
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        // 첫 번째 활성 클라이언트 사용
        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🕐 DDC 시간 설정 조회 대상 클라이언트: ${clientId} (${activeClient.name})`);

        // DDC 시간 설정 조회 (SystemService 사용)
        const settings = await systemService.getSettings();
        const ddcTime = settings?.ddcTime;

        if (ddcTime) {
          return reply.send(createSuccessResponse('DDC 시간 설정 조회 성공', { ddcTime }));
        }

        // 🆕 DDC 시간 설정이 없으면 기본값 생성 후 반환
        fastify.log.warn(`DDC 시간 설정이 없어 기본값 생성: ${clientId}`);

        // 현재 시간으로 기본값 생성
        const now = new Date();
        const defaultDdcTime = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          dow: now.getDay(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: now.getSeconds(),
        };

        // 기본값 저장
        await systemService.updateSettings({ ddcTime: defaultDdcTime });

        return reply.send(createSuccessResponse('DDC 시간 설정 조회 성공 (기본값 생성)', { ddcTime: defaultDdcTime }));
      } catch (error) {
        fastify.log.error(`DDC 시간 설정 조회 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `DDC 시간 설정 조회 실패: ${error}`,
        });
      }
    },
  );

  // 🆕 DDC 시간 동기화 엔드포인트 추가
  fastify.post(
    '/system/ddc-time/sync',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  ddcTime: {
                    type: 'object',
                    properties: {
                      year: { type: 'number' },
                      month: { type: 'number' },
                      day: { type: 'number' },
                      dow: { type: 'number' },
                      hour: { type: 'number' },
                      minute: { type: 'number' },
                      second: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();
        const systemService = serviceContainer.getSystemService();

        // 🆕 실제 클라이언트 정보 조회
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🕐 DDC 시간 동기화 요청 - 클라이언트: ${clientId} (${activeClient.name})`);

        // 수동 실행도 서비스 기동 시 사용하는 DdcTimeSyncService를 사용
        await ddcTimeSyncService.syncDdcTime();

        // 최신 시스템 설정에서 ddcTime을 읽어 응답
        const settings = await systemService.getSettings();
        const ddcTime = settings?.ddcTime || null;

        return reply.send(createSuccessResponse('DDC 시간이 성공적으로 동기화되었습니다.', { ddcTime }));
      } catch (error) {
        fastify.log.error(`DDC 시간 동기화 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `DDC 시간 동기화 실패: ${error}`,
        });
      }
    },
  );

  // 🆕 DDC 시간 새로고침 엔드포인트
  fastify.post(
    '/system/ddc-time/refresh',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  ddcTime: {
                    type: 'object',
                    properties: {
                      year: { type: 'number' },
                      month: { type: 'number' },
                      day: { type: 'number' },
                      dow: { type: 'number' },
                      hour: { type: 'number' },
                      minute: { type: 'number' },
                      second: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const systemService = serviceContainer.getSystemService();
        const clientRepository = serviceContainer.getClientRepository();
        const clients = await clientRepository.findAll();

        if (!clients || clients.length === 0) {
          return reply.code(400).send({
            success: false,
            message: '활성 클라이언트가 없습니다.',
          });
        }

        const activeClient = clients[0];
        const clientId = activeClient.id;

        fastify.log.info(`🕐 DDC 시간 새로고침 요청 - 클라이언트: ${clientId} (${activeClient.name})`);

        const result = await systemService.refreshDdcTime(clientId);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(`DDC 시간 새로고침 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `DDC 시간 새로고침 실패: ${error}`,
        });
      }
    },
  );

  // 🕐 DDC 시간 동기화 상태 조회
  fastify.get(
    '/system/ddc-time-sync/status',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  lastSyncTime: { type: 'string', format: 'date-time' },
                  nextSyncTime: { type: 'string', format: 'date-time' },
                  syncStatus: { type: 'string' },
                  clientId: { type: 'string' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();

        const status = {
          lastSyncTime: ddcTimeSyncService.getLastSyncTime(),
          nextSyncTime: ddcTimeSyncService.getNextSyncTime(),
          syncStatus: ddcTimeSyncService.getSyncStatus(),
          clientId: ddcTimeSyncService.getClientId(),
        };

        return reply.send(createSuccessResponse('DDC 시간 동기화 상태 조회 성공', status));
      } catch (error) {
        logError(`DDC 시간 동기화 상태 조회 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `DDC 시간 동기화 상태 조회 실패: ${error}`,
        });
      }
    },
  );

  // 🕐 DDC 시간 동기화 수동 실행
  fastify.post(
    '/system/ddc-time-sync/execute',
    {
      preHandler: [fastify.requireAuth],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();

        // 수동으로 DDC 시간 동기화 실행
        await ddcTimeSyncService.syncDdcTime();

        return reply.send(createSuccessResponse('DDC 시간 동기화 수동 실행 성공', null));
      } catch (error) {
        logError(`DDC 시간 동기화 수동 실행 실패: ${error}`);
        return reply.code(500).send({
          success: false,
          message: `DDC 시간 동기화 수동 실행 실패: ${error}`,
        });
      }
    },
  );
}
