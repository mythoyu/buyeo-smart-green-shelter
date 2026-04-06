import { FastifyInstance } from 'fastify';

// 라우터 import
import apiKeysRoutes from '../api/v1/routes/apiKeys';
import authRoutes from '../api/v1/routes/auth';
import clientRoutes from '../api/v1/routes/client';
import clientsRoutes from '../api/v1/routes/clients';
import dataRoutes from '../api/v1/routes/data';
import controlRoutes from '../api/v1/routes/devices';
import domainStatusRoutes from '../api/v1/routes/domain-status';
import errorsRoutes from '../api/v1/routes/errors';
import hardwareRoutes from '../api/v1/routes/hardware';
import logsRoutes from '../api/v1/routes/logs';
import peopleCounterExternalRoutes from '../api/v1/routes/people-counter-external';
import statusRoutes from '../api/v1/routes/status';
import systemRoutes from '../api/v1/routes/system';
import systemMonitoringRoutes from '../api/v1/routes/system-monitoring';
import systemSeasonalRoutes from '../api/v1/routes/system/seasonal';
import systemRestartBackendExternalRoutes from '../api/v1/routes/system/restart-backend-external';
import usersRoutes from '../api/v1/routes/users';
import { logInfo, logError, logDebug } from '../logger';

import type { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';

type RouteModule = FastifyPluginCallback | FastifyPluginAsync;

export class RouterManager {
  private static instance: RouterManager;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): RouterManager {
    if (!RouterManager.instance) {
      RouterManager.instance = new RouterManager();
    }
    return RouterManager.instance;
  }

  /**
   * 내부 라우터 등록 (관리자용)
   */
  public async registerInternalRoutes(app: FastifyInstance, routes: RouteModule[]): Promise<void> {
    logInfo('🔧 내부 라우터 등록 시작...');

    app.register(
      (instance, _opts, done) => {
        routes.forEach((route, index) => {
          try {
            instance.register(route);
          } catch (error) {
            logError(`내부 라우터 ${index + 1} 등록 실패: ${error}`);
          }
        });
        logInfo('✅ 내부 라우터 등록 완료');
        done();
      },
      { prefix: '/api/v1/internal' },
    );
  }

  /**
   * 외부 라우터 등록 (파트너사용)
   */
  public async registerExternalRoutes(app: FastifyInstance, routes: RouteModule[]): Promise<void> {
    logInfo('🔧 외부 라우터 등록 시작...');

    app.register(
      (instance, _opts, done) => {
        routes.forEach((route, index) => {
          try {
            instance.register(route);
          } catch (error) {
            logError(`외부 라우터 ${index + 1} 등록 실패: ${error}`);
          }
        });
        logInfo('✅ 외부 라우터 등록 완료');
        done();
      },
      { prefix: '/api/v1/external' },
    );
  }

  /**
   * 내부 라우터 목록 반환
   */
  public getInternalRoutes(): RouteModule[] {
    return [
      authRoutes,
      usersRoutes,
      apiKeysRoutes,
      systemRoutes,
      systemMonitoringRoutes, // 🆕 시스템 모니터링 라우트 추가
      clientRoutes,
      clientsRoutes,
      statusRoutes,
      dataRoutes,
      errorsRoutes,
      logsRoutes,
      controlRoutes,
      domainStatusRoutes,
      hardwareRoutes, // 🆕 새로운 하드웨어 제어 라우트 추가
    ];
  }

  /**
   * 외부 라우터 목록 반환
   */
  public getExternalRoutes(): RouteModule[] {
    return [
      clientRoutes,
      clientsRoutes,
      statusRoutes,
      dataRoutes,
      errorsRoutes,
      controlRoutes,
      systemSeasonalRoutes,
      systemRestartBackendExternalRoutes,
      peopleCounterExternalRoutes,
    ];
  }

  /**
   * 모든 라우터 등록
   */
  public async registerAllRoutes(app: FastifyInstance): Promise<void> {
    const internalRoutes = this.getInternalRoutes();
    const externalRoutes = this.getExternalRoutes();

    logDebug(
      `📋 내부 라우터 목록: ${internalRoutes
        .map((route, index) => `${index + 1}. ${(route as any).name || '익명 라우터'}`)
        .join(', ')}`,
    );

    logDebug(
      `📋 외부 라우터 목록: ${externalRoutes
        .map((route, index) => `${index + 1}. ${(route as any).name || '익명 라우터'}`)
        .join(', ')}`,
    );

    // 라우터 등록
    await this.registerInternalRoutes(app, internalRoutes);
    await this.registerExternalRoutes(app, externalRoutes);
  }
}
