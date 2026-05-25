import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { PortMappingService } from '../../../core/services/PortMappingService';
import {
  DI_PORT_KEYS,
  DO_PORT_KEYS,
  isDiAssignableDeviceType,
  isDiPortKey,
  isDoAssignableDeviceType,
  isDoPortKey,
} from '../../../data/portMapping';
import { createErrorResponse, createSuccessResponse } from '../../../shared/utils/responseHelper';
import { Logger } from '../../../shared/services/Logger';

const routeLog = new Logger();

function assertPollingStopped(reply: FastifyReply): boolean {
  const pollingService = ServiceContainer.getInstance().getUnifiedModbusPollerService();
  if (pollingService.isPollingActive()) {
    reply
      .code(409)
      .send(
        createErrorResponse(
          'POLLING_ACTIVE',
          '폴링이 실행 중입니다. 접점 포트 설정을 변경하려면 폴링을 중지하세요.',
        ),
      );
    return false;
  }
  return true;
}

async function portAssignmentsRoutes(app: FastifyInstance) {
  const portMapping = PortMappingService.getInstance();

  const handleGet = async (clientId: string, reply: FastifyReply) => {
    const [doAssignments, diAssignments] = await Promise.all([
      portMapping.listDoAssignmentsForClient(clientId),
      portMapping.listDiAssignmentsForClient(clientId),
    ]);
    const pollingService = ServiceContainer.getInstance().getUnifiedModbusPollerService();

    return reply.send(
      createSuccessResponse('접점 포트 할당 목록 조회 성공', {
        clientId,
        pollingActive: pollingService.isPollingActive(),
        doAssignments,
        diAssignments,
        doPortKeys: DO_PORT_KEYS,
        diPortKeys: DI_PORT_KEYS,
      }),
    );
  };

  app.get(
    '/clients/:clientId/port-assignments',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        return handleGet(clientId, reply);
      } catch (error) {
        routeLog.error(`접점 포트 할당 조회 실패: ${error}`);
        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              error instanceof Error ? error.message : '접점 포트 할당 조회 중 오류가 발생했습니다.',
            ),
          );
      }
    },
  );

  /** @deprecated /port-assignments 사용 */
  app.get(
    '/clients/:clientId/do-assignments',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        return handleGet(clientId, reply);
      } catch (error) {
        routeLog.error(`DO 할당 조회 실패: ${error}`);
        return reply.code(500).send(createErrorResponse('INTERNAL_ERROR', String(error)));
      }
    },
  );

  app.put(
    '/clients/:clientId/port-assignments',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!assertPollingStopped(reply)) {
        return;
      }

      try {
        const { clientId } = request.params as { clientId: string };
        const body = (request.body ?? {}) as {
          doAssignments?: Array<{ deviceType: string; unitId: string; doPort: string }>;
          diAssignments?: Array<{ deviceType: string; unitId: string; diPort: string }>;
        };

        const doAssignments: Array<{
          deviceType: string;
          unitId: string;
          doPort: import('../../../data/portMapping').DoPortKey;
        }> = [];
        for (const row of body.doAssignments ?? []) {
          if (!isDoAssignableDeviceType(row.deviceType)) {
            return reply
              .code(400)
              .send(createErrorResponse('INVALID_PARAM', `DO 할당 불가 장비 타입: ${row.deviceType}`));
          }
          if (!isDoPortKey(row.doPort)) {
            return reply.code(400).send(createErrorResponse('INVALID_PARAM', `잘못된 DO 포트: ${row.doPort}`));
          }
          doAssignments.push({ deviceType: row.deviceType, unitId: row.unitId, doPort: row.doPort });
        }

        const diAssignments: Array<{
          deviceType: string;
          unitId: string;
          diPort: import('../../../data/portMapping').DiPortKey;
        }> = [];
        for (const row of body.diAssignments ?? []) {
          if (!isDiAssignableDeviceType(row.deviceType)) {
            return reply
              .code(400)
              .send(createErrorResponse('INVALID_PARAM', `DI 할당 불가 장비 타입: ${row.deviceType}`));
          }
          if (!isDiPortKey(row.diPort)) {
            return reply.code(400).send(createErrorResponse('INVALID_PARAM', `잘못된 DI 포트: ${row.diPort}`));
          }
          diAssignments.push({ deviceType: row.deviceType, unitId: row.unitId, diPort: row.diPort });
        }

        const updatedBy = (request as { apiKey?: { name?: string } }).apiKey?.name;
        await portMapping.saveClientPortAssignments(
          clientId,
          { doAssignments, diAssignments },
          updatedBy,
        );

        return reply.send(
          createSuccessResponse('접점 포트 할당 저장 성공', {
            clientId,
            savedDo: doAssignments.length,
            savedDi: diAssignments.length,
          }),
        );
      } catch (error) {
        routeLog.error(`접점 포트 할당 저장 실패: ${error}`);
        const message = error instanceof Error ? error.message : '접점 포트 할당 저장 중 오류가 발생했습니다.';
        if (message.includes('중복')) {
          return reply.code(400).send(createErrorResponse('VALIDATION_ERROR', message));
        }
        return reply.code(500).send(createErrorResponse('INTERNAL_ERROR', message));
      }
    },
  );

  app.put(
    '/clients/:clientId/do-assignments',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!assertPollingStopped(reply)) {
        return;
      }
      try {
        const { clientId } = request.params as { clientId: string };
        const body = (request.body ?? {}) as {
          assignments?: Array<{ deviceType: string; unitId: string; doPort: string }>;
        };
        const updatedBy = (request as { apiKey?: { name?: string } }).apiKey?.name;
        const doAssignments = (body.assignments ?? []).filter(
          (r): r is { deviceType: string; unitId: string; doPort: import('../../../data/portMapping').DoPortKey } =>
            isDoAssignableDeviceType(r.deviceType) && isDoPortKey(r.doPort),
        );
        await portMapping.saveClientPortAssignments(clientId, { doAssignments }, updatedBy);
        return reply.send(createSuccessResponse('DO 할당 저장 성공', { clientId, saved: doAssignments.length }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return reply.code(500).send(createErrorResponse('INTERNAL_ERROR', message));
      }
    },
  );

  const handleReset = async (clientId: string, reply: FastifyReply) => {
    const result = await portMapping.resetClientFromTs(clientId);
    const [doAssignments, diAssignments] = await Promise.all([
      portMapping.listDoAssignmentsForClient(clientId),
      portMapping.listDiAssignmentsForClient(clientId),
    ]);

    return reply.send(
      createSuccessResponse('접점 포트 할당을 기본값으로 초기화했습니다.', {
        clientId,
        doInserted: result.doInserted,
        diInserted: result.diInserted,
        doAssignments,
        diAssignments,
      }),
    );
  };

  app.post(
    '/clients/:clientId/port-assignments/reset',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!assertPollingStopped(reply)) {
        return;
      }
      try {
        const { clientId } = request.params as { clientId: string };
        return handleReset(clientId, reply);
      } catch (error) {
        routeLog.error(`접점 포트 초기화 실패: ${error}`);
        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              error instanceof Error ? error.message : '접점 포트 초기화 중 오류가 발생했습니다.',
            ),
          );
      }
    },
  );

  app.post(
    '/clients/:clientId/do-assignments/reset',
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!assertPollingStopped(reply)) {
        return;
      }
      try {
        const { clientId } = request.params as { clientId: string };
        return handleReset(clientId, reply);
      } catch (error) {
        return reply.code(500).send(createErrorResponse('INTERNAL_ERROR', String(error)));
      }
    },
  );
}

export default fp(portAssignmentsRoutes);
