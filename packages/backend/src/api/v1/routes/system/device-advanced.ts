import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { createSuccessResponse, createErrorResponse } from '../../../../shared/utils/responseHelper';
import { DeviceAdvancedRequestSchema, DeviceAdvancedResponseSchema } from '../../schemas/system.schema';

interface DeviceAdvancedRequest {
  Body: {
    temp: {
      'fine-tuning-summer': number;
      'fine-tuning-winter': number;
    };
  };
}

const deviceAdvancedRoutes = async (fastify: FastifyInstance) => {
  // GET /device-advanced - 디바이스 상세설정 조회
  fastify.get<{ Reply: any }>(
    '/system/device-advanced',
    {
      schema: {
        response: {
          200: DeviceAdvancedResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const systemService = fastify.serviceContainer.getSystemService();
        const deviceAdvancedSettings = await systemService.getDeviceAdvancedSettings();

        if (!deviceAdvancedSettings) {
          return reply.code(404).send(createErrorResponse('디바이스 상세설정을 찾을 수 없습니다.', 'NOT_FOUND'));
        }

        return reply.send(createSuccessResponse('디바이스 상세설정 조회 성공', deviceAdvancedSettings));
      } catch (error) {
        fastify.log.error('디바이스 상세설정 조회 실패:', error as any);
        return reply.code(500).send(createErrorResponse('디바이스 상세설정 조회에 실패했습니다.', 'INTERNAL_ERROR'));
      }
    },
  );

  // POST /device-advanced - 디바이스 상세설정 저장/업데이트
  fastify.post<DeviceAdvancedRequest>(
    '/system/device-advanced',
    {
      schema: {
        body: DeviceAdvancedRequestSchema,
        response: {
          200: DeviceAdvancedResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<DeviceAdvancedRequest>, reply: FastifyReply) => {
      try {
        const { temp } = request.body;
        const systemService = fastify.serviceContainer.getSystemService();

        const updatedSettings = await systemService.updateDeviceAdvancedSettings({
          temp: {
            'fine-tuning-summer': temp['fine-tuning-summer'],
            'fine-tuning-winter': temp['fine-tuning-winter'],
          },
        });

        if (!updatedSettings) {
          return reply.code(500).send(createErrorResponse('디바이스 상세설정 저장에 실패했습니다.', 'INTERNAL_ERROR'));
        }

        return reply.send(createSuccessResponse('디바이스 상세설정이 성공적으로 저장되었습니다.', updatedSettings));
      } catch (error) {
        fastify.log.error('디바이스 상세설정 저장 실패:', error as any);
        return reply.code(500).send(createErrorResponse('디바이스 상세설정 저장에 실패했습니다.', 'INTERNAL_ERROR'));
      }
    },
  );
};

export default deviceAdvancedRoutes;
