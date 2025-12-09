import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const DOMAIN_STATUS_ENDPOINTS = {
  DOMAIN_STATUS: '/domain/status',
  DOMAIN_BY_NAME: '/domain/:domainName/status',
  DOMAIN_HEALTH: '/domain/health',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { logInfo } from '../../../logger';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  handleRouteError,
} from '../../../shared/utils/responseHelper';

async function domainStatusRoutes(app: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();

  // GET /domain/status (전체 도메인 상태 조회)
  app.get(
    DOMAIN_STATUS_ENDPOINTS.DOMAIN_STATUS,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('[GET /domain/status] 전체 도메인 상태 조회 요청');

        const allDomainStatus = serviceContainer.getAllDomainStatus();

        reply.send(
          createSuccessResponse('전체 도메인 상태 조회 성공', {
            domains: allDomainStatus,
            description: '모든 도메인의 서비스 상태 정보입니다.',
            usage: '/api/v1/internal/domain/status',
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'domain-status', '전체 도메인 상태 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /domain/{domainName}/status (특정 도메인 상태 조회)
  app.get(
    DOMAIN_STATUS_ENDPOINTS.DOMAIN_BY_NAME,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainName } = request.params as { domainName: string };
        logInfo(`[GET /domain/${domainName}/status] ${domainName} 도메인 상태 조회 요청`);

        let domainStatus: any;
        let domainDescription: string;

        switch (domainName.toLowerCase()) {
          case 'device':
            domainStatus = serviceContainer.getDeviceDomainServices();
            domainDescription = 'Device 도메인의 모든 서비스 상태 정보입니다.';
            break;
          case 'system':
            domainStatus = serviceContainer.getSystemDomainServices();
            domainDescription = 'System 도메인의 모든 서비스 상태 정보입니다.';
            break;
          case 'user':
            domainStatus = serviceContainer.getUserDomainServices();
            domainDescription = 'User 도메인의 모든 서비스 상태 정보입니다.';
            break;
          default:
            return reply
              .code(404)
              .send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, `도메인 '${domainName}'을 찾을 수 없습니다.`));
        }

        reply.send(
          createSuccessResponse(`${domainName} 도메인 상태 조회 성공`, {
            domain: domainName,
            services: domainStatus,
            description: domainDescription,
            usage: `/api/v1/internal/domain/${domainName}/status`,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'domain-status', '도메인 상태 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /domain/health (도메인 헬스 체크)
  app.get(
    DOMAIN_STATUS_ENDPOINTS.DOMAIN_HEALTH,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('[GET /domain/health] 도메인 헬스 체크 요청');

        const allDomainStatus = serviceContainer.getAllDomainStatus();

        // 각 도메인의 서비스 가용성 확인
        const healthStatus = {
          device: {
            available: !!allDomainStatus.deviceDomain.controlService,
            status: 'healthy',
          },
          system: {
            available: !!allDomainStatus.systemDomain.systemService,
            status: 'healthy',
          },
          user: {
            available: !!allDomainStatus.userDomain.userService,
            status: 'healthy',
          },
          overall: 'healthy',
          timestamp: new Date().toISOString(),
        };

        // 전체 상태가 healthy인지 확인
        const allHealthy = Object.values(healthStatus).every(
          (domain) => domain === 'healthy' || (typeof domain === 'object' && domain.status === 'healthy'),
        );

        if (!allHealthy) {
          healthStatus.overall = 'degraded';
        }

        reply.send(
          createSuccessResponse('도메인 헬스 체크 완료', {
            health: healthStatus,
            description: '모든 도메인의 헬스 상태 정보입니다.',
            usage: '/api/v1/internal/domain/health',
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'domain-status', '도메인 헬스 체크 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(domainStatusRoutes);
