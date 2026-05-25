import { ILogger } from '../interfaces/ILogger';
import { ServiceContainer } from '../container/ServiceContainer';

/**
 * DB pollingEnabled + UnifiedModbusPoller 시작/중지 (POST /system/polling 과 동일)
 */
export async function applyPollingEnabled(
  pollingEnabled: boolean,
  logger?: ILogger,
): Promise<{ pollingEnabled: boolean; applyInProgress: boolean }> {
  const serviceContainer = ServiceContainer.getInstance();
  const systemService = serviceContainer.getSystemService();
  const pollingService = serviceContainer.getUnifiedModbusPollerService();
  const webSocketService = serviceContainer.getWebSocketService();

  const currentState = await systemService.getPollingState(true);
  if (!currentState) {
    throw new Error('시스템 상태 초기화에 실패했습니다');
  }

  if (currentState.applyInProgress) {
    throw new Error('Data 적용 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.');
  }

  const updated = await systemService.updatePollingState(pollingEnabled);
  if (!updated?.runtime) {
    throw new Error('폴링 상태 업데이트에 실패했습니다');
  }

  if (pollingService) {
    if (pollingEnabled) {
      const { Data } = await import('../../models/schemas/DataSchema');
      const deviceCount = await Data.countDocuments({});
      if (deviceCount === 0) {
        await pollingService.startBasicPolling();
        logger?.info('[PollingControl] basic polling started');
      } else {
        await pollingService.startAllSNGILPolling();
        logger?.info('[PollingControl] SNGIL polling started');
      }
      webSocketService?.broadcastLog('info', 'system', '폴링 ON');
    } else {
      pollingService.stopAllPolling();
      const modbusService = serviceContainer.getUnifiedModbusService();
      modbusService?.clearQueue();
      webSocketService?.broadcastLog('info', 'system', '폴링 OFF');
      logger?.info('[PollingControl] polling stopped');
    }
  }

  return {
    pollingEnabled: updated.runtime.pollingEnabled,
    applyInProgress: updated.runtime.applyInProgress,
  };
}
