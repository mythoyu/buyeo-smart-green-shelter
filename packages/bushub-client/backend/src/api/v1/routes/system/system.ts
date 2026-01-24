import { FastifyInstance } from 'fastify';

import systemDdcTimeRoutes from './ddc-time';
import systemDeviceAdvancedRoutes from './device-advanced';
import systemGeneralRoutes from './general';
import peopleCounterRoutes from './people-counter';
import systemPollingRoutes from './polling';
import systemSeasonalRoutes from './seasonal';

export default async function systemRoutes(app: FastifyInstance) {
  // 각 시스템 라우트 모듈 등록
  await systemGeneralRoutes(app);
  await systemSeasonalRoutes(app);
  await systemDdcTimeRoutes(app);
  await systemPollingRoutes(app);
  await systemDeviceAdvancedRoutes(app);
  await peopleCounterRoutes(app);
}
