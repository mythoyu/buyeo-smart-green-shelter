/**
 * System Polling API Routes
 */

import { FastifyInstance } from 'fastify';

import { ILogger } from '../../../../core/interfaces/ILogger';
import { applyPollingEnabled } from '../../../../core/services/PollingControlService';
import { logError, logDebug } from '../../../../logger';
import { POLLING_RECOVERY_AUTO_DISMISS_SEC } from '../../../../shared/types/pollingRecovery';

export default async function systemPollingRoutes(fastify: FastifyInstance) {
  const logger: ILogger = fastify.log;
  const { serviceContainer } = fastify;

  fastify.get('/system/polling/state', async (request, reply) => {
    try {
      const systemService = serviceContainer.getSystemService();
      const pollingService = serviceContainer.getUnifiedModbusPollerService();
      const pollingState = await systemService.getPollingState(true);

      if (!pollingState) {
        return (reply as any).code(500).send({
          success: false,
          message: '폴링 상태 초기화에 실패했습니다',
        });
      }

      const pendingPrompt =
        pollingState.recoveryPrompt?.status === 'pending' ? pollingState.recoveryPrompt : undefined;

      return reply.send({
        success: true,
        data: {
          pollingEnabled: pollingState.pollingEnabled,
          applyInProgress: pollingState.applyInProgress,
          modbusPollingActive: pollingService?.isPollingActive() ?? false,
          recoveryPrompt: pendingPrompt,
          autoDismissSec: POLLING_RECOVERY_AUTO_DISMISS_SEC,
        },
      });
    } catch (error) {
      logError(`[system/polling/state] ${error}`);
      return (reply as any).code(500).send({
        success: false,
        message: '내부 서버 오류',
        error: String(error),
      });
    }
  });

  fastify.post('/system/polling', async (request, reply) => {
    try {
      const { pollingEnabled } = request.body as { pollingEnabled: boolean };

      if (typeof pollingEnabled !== 'boolean') {
        return (reply as any).code(400).send({
          success: false,
          message: 'pollingEnabled는 boolean 값이어야 합니다',
        });
      }

      logDebug(`[system/polling] toggle ${pollingEnabled ? 'on' : 'off'}`);

      const systemService = serviceContainer.getSystemService();
      const currentState = await systemService.getPollingState(true);
      if (!currentState) {
        return (reply as any).code(500).send({
          success: false,
          message: '시스템 상태 초기화에 실패했습니다',
        });
      }

      if (currentState.applyInProgress) {
        return (reply as any).code(409).send({
          success: false,
          message: 'Data 적용 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.',
        });
      }

      if (currentState.recoveryPrompt?.status === 'pending') {
        await systemService.clearRecoveryPrompt();
      }

      const data = await applyPollingEnabled(pollingEnabled, logger);

      return reply.send({
        success: true,
        data,
        message: `폴링이 ${pollingEnabled ? '시작' : '중지'}되었습니다`,
      });
    } catch (error) {
      logError(`[system/polling] ${error}`);
      const message = error instanceof Error ? error.message : '폴링 상태 변경 중 오류가 발생했습니다';
      return (reply as any).code(500).send({
        success: false,
        message,
      });
    }
  });

  fastify.post('/system/polling/recovery/respond', async (request, reply) => {
    try {
      const body = request.body as { promptId?: string; action?: string };
      const { promptId, action } = body;

      if (!promptId || (action !== 'accept' && action !== 'dismiss')) {
        return (reply as any).code(400).send({
          success: false,
          message: 'promptId와 action(accept|dismiss)가 필요합니다',
        });
      }

      const recoveryService = serviceContainer.getPollingAutoRecoveryService();
      const result = await recoveryService.respondToRecoveryPrompt(promptId, action);

      if (!result.success) {
        return (reply as any).code(409).send({
          success: false,
          message: result.message ?? '복구 제안 처리 실패',
        });
      }

      const systemService = serviceContainer.getSystemService();
      const pollingService = serviceContainer.getUnifiedModbusPollerService();
      const pollingState = await systemService.getPollingState(false);

      return reply.send({
        success: true,
        data: {
          pollingEnabled: pollingState?.pollingEnabled ?? false,
          modbusPollingActive: pollingService?.isPollingActive() ?? false,
        },
        message: action === 'accept' ? '폴링이 시작되었습니다' : '폴링이 중지된 상태로 유지됩니다',
      });
    } catch (error) {
      logError(`[system/polling/recovery/respond] ${error}`);
      return (reply as any).code(500).send({
        success: false,
        message: error instanceof Error ? error.message : '복구 제안 처리 중 오류',
      });
    }
  });
}
