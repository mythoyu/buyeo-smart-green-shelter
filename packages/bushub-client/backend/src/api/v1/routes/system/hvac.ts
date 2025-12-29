import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/responseHelper';
import { HvacRequestSchema, HvacResponseSchema } from '../../schemas/system.schema';

interface HvacRequest {
  Body: {
    externalControlEnabled?: boolean;
    manufacturer?: 'SAMSUNG' | 'LG' | null;
    modbus?: {
      port?: string;
      baudRate?: number;
      parity?: 'none' | 'even' | 'odd';
    };
  };
}

const hvacRoutes = async (fastify: FastifyInstance) => {
  // GET /system/hvac - 냉난방기 외부제어 설정 조회
  fastify.get<{ Reply: any }>(
    '/system/hvac',
    {
      schema: {
        response: {
          200: HvacResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const systemService = fastify.serviceContainer.getSystemService();
        const hvacSettings = await systemService.getHvacSettings();

        if (!hvacSettings) {
          return reply.code(404).send(createErrorResponse('냉난방기 외부제어 설정을 찾을 수 없습니다.', 'NOT_FOUND'));
        }

        return reply.send(createSuccessResponse('냉난방기 외부제어 설정 조회 성공', hvacSettings));
      } catch (error) {
        fastify.log.error('냉난방기 외부제어 설정 조회 실패:', error as any);
        return reply
          .code(500)
          .send(createErrorResponse('냉난방기 외부제어 설정 조회에 실패했습니다.', 'INTERNAL_ERROR'));
      }
    },
  );

  // POST /system/hvac - 냉난방기 외부제어 설정 저장/업데이트
  fastify.post<HvacRequest>(
    '/system/hvac',
    {
      schema: {
        body: HvacRequestSchema,
        response: {
          200: HvacResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<HvacRequest>, reply: FastifyReply) => {
      try {
        const { externalControlEnabled, manufacturer, modbus } = request.body;
        const systemService = fastify.serviceContainer.getSystemService();

        // optional 필드 처리 (undefined 제거)
        const settingsToUpdate: {
          externalControlEnabled?: boolean;
          manufacturer?: 'SAMSUNG' | 'LG' | null;
          modbus?: {
            port?: string;
            baudRate?: number;
            parity?: 'none' | 'even' | 'odd';
          };
        } = {};
        
        if (externalControlEnabled !== undefined) {
          settingsToUpdate.externalControlEnabled = externalControlEnabled;
        }
        if (manufacturer !== undefined) {
          settingsToUpdate.manufacturer = manufacturer;
        }
        if (modbus !== undefined) {
          settingsToUpdate.modbus = modbus;
        }

        const updatedSettings = await systemService.updateHvacSettings(settingsToUpdate);

        if (!updatedSettings) {
          return reply
            .code(500)
            .send(createErrorResponse('냉난방기 외부제어 설정 저장에 실패했습니다.', 'INTERNAL_ERROR'));
        }

        return reply.send(
          createSuccessResponse('냉난방기 외부제어 설정이 성공적으로 저장되었습니다.', updatedSettings),
        );
      } catch (error) {
        fastify.log.error('냉난방기 외부제어 설정 저장 실패:', error as any);
        return reply
          .code(500)
          .send(createErrorResponse('냉난방기 외부제어 설정 저장에 실패했습니다.', 'INTERNAL_ERROR'));
      }
    },
  );
};

export default hvacRoutes;

