import { FastifyInstance } from 'fastify';

// API 엔드포인트 상수
export const SYSTEM_GENERAL_ENDPOINTS = {
  SYSTEM: '/system',
  SYSTEM_MODE: '/system/mode',
  SYSTEM_POLLING_INTERVAL: '/system/polling/interval',
  SYSTEM_SCHEMA: '/system/schema',
  SYSTEM_DOMAIN_STATUS: '/system/domain/status',
  SYSTEM_PING_TEST: '/system/ping-test',
  // SYSTEM_CURRENT_MODE_STATUS: '/system/current-mode-status', // 제거됨
} as const;

import { ServiceContainer } from '../../../../core/container/ServiceContainer';
import { logInfo } from '../../../../logger';
import {
  createSuccessResponse,
  HttpValidationError,
  HttpSystemError,
  handleHttpError,
} from '../../../../shared/utils/responseHelper';
import {
  SystemSettingsResponseSchema,
  SystemSettingsUpdateRequestSchema,
  SystemModeRequestSchema,
  SystemModeResponseSchema,
  SYSTEM_SETTINGS_RESPONSE_EXAMPLE,
  SYSTEM_SETTINGS_UPDATE_REQUEST_EXAMPLE,
  SYSTEM_MODE_REQUEST_EXAMPLE,
  SYSTEM_MODE_RESPONSE_EXAMPLE,
} from '../../schemas/system.schema';

export default async function systemGeneralRoutes(app: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();

  // System 도메인 서비스들 가져오기
  const systemServices = serviceContainer.getSystemDomainServices();
  const { systemService } = systemServices;
  const { logSchedulerService } = systemServices;
  const { webSocketService } = systemServices;
  const { unifiedLogService } = systemServices;
  const rebootSchedulerService = ServiceContainer.getInstance().getRebootSchedulerService();

  // 시스템 전체 설정 조회
  app.get(SYSTEM_GENERAL_ENDPOINTS.SYSTEM, { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      logInfo('[GET /system] 시스템 설정 조회 요청');

      const systemDoc = await systemService.getSettings();

      logInfo('[GET /system] 응답 완료');

      return createSuccessResponse('시스템 환경설정 조회 성공', systemDoc);
    } catch (error) {
      logInfo('[GET /system] 에러 발생');
      return handleHttpError(new HttpSystemError('시스템 설정 조회 중 오류'), reply);
    }
  });

  // action 기반 시스템 명령 처리
  app.post(SYSTEM_GENERAL_ENDPOINTS.SYSTEM, { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      const { action, backupPath, rebootSchedule } = request.body as {
        action: string;
        backupPath?: string;
        rebootSchedule?: {
          enabled?: boolean;
          mode?: string;
          hour?: number;
          daysOfWeek?: number[];
        };
      };

      logInfo(`[POST /system] action: ${action} 요청`);

      switch (action) {
        case 'reset':
          // SettingsService 제거됨 - Network Control API로 대체 필요
          return handleHttpError(
            new HttpValidationError('SettingsService가 제거되었습니다. Network Control API를 사용하세요.'),
            reply,
          );

        case 'apply':
          // SettingsService 제거됨 - Network Control API로 대체 필요
          return handleHttpError(
            new HttpValidationError('SettingsService가 제거되었습니다. Network Control API를 사용하세요.'),
            reply,
          );

        case 'export':
          // SettingsService 제거됨 - Network Control API로 대체 필요
          return handleHttpError(
            new HttpValidationError('SettingsService가 제거되었습니다. Network Control API를 사용하세요.'),
            reply,
          );

        case 'import':
          // SettingsService 제거됨 - Network Control API로 대체 필요
          return handleHttpError(
            new HttpValidationError('SettingsService가 제거되었습니다. Network Control API를 사용하세요.'),
            reply,
          );

        case 'update-reboot-schedule': {
          if (!rebootSchedule) {
            return handleHttpError(
              new HttpValidationError('rebootSchedule 객체가 필요합니다.'),
              reply,
            );
          }

          const { enabled, mode, hour, daysOfWeek } = rebootSchedule;

          if (typeof enabled !== 'boolean') {
            return handleHttpError(
              new HttpValidationError('rebootSchedule.enabled는 boolean이어야 합니다.'),
              reply,
            );
          }

          if (mode !== 'daily' && mode !== 'weekly') {
            return handleHttpError(
              new HttpValidationError("rebootSchedule.mode는 'daily' 또는 'weekly' 여야 합니다."),
              reply,
            );
          }

          if (!Number.isInteger(hour ?? NaN) || hour! < 0 || hour! > 23) {
            return handleHttpError(
              new HttpValidationError('rebootSchedule.hour는 0~23 사이의 정수여야 합니다.'),
              reply,
            );
          }

          if (mode === 'weekly') {
            if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
              return handleHttpError(
                new HttpValidationError(
                  'rebootSchedule.mode가 weekly일 때 daysOfWeek는 0~6 값의 배열이어야 합니다.',
                ),
                reply,
              );
            }

            const invalidDay = daysOfWeek.find(
              (d) => !Number.isInteger(d) || d < 0 || d > 6,
            );
            if (invalidDay !== undefined) {
              return handleHttpError(
                new HttpValidationError('daysOfWeek 값은 0~6 사이의 정수여야 합니다.'),
                reply,
              );
            }
          }

          const updated = await systemService.updateRebootSchedule({
            enabled,
            mode,
            hour: hour as number,
            daysOfWeek,
          });

          return reply.send(
            createSuccessResponse('자동 재부팅 스케줄이 업데이트되었습니다.', {
              rebootSchedule: updated?.runtime?.rebootSchedule,
            }),
          );
        }

        case 'restart':
          try {
            await rebootSchedulerService.triggerHostReboot('manual');
            return reply.send(
              createSuccessResponse(
                '호스트 PC 재기동 요청이 접수되었습니다. 컨테이너 환경에서는 호스트에서 직접 재부팅이 필요할 수 있습니다.',
              ),
            );
          } catch (error) {
            logInfo(`호스트 PC 재기동 요청 중 오류: ${error}`);
            return handleHttpError(new HttpSystemError('호스트 PC 재기동 실행 중 오류가 발생했습니다.'), reply);
          }

        case 'restart-backend':
          // 백엔드 재기동 명령 실행
          const execAsyncBackend = promisify(exec);

          try {
            // WebSocket으로 백엔드 재기동 알림 전송
            const webSocketService = serviceContainer.getWebSocketService();
            webSocketService?.broadcastLog('info', 'system', '백엔드 서비스를 재시작합니다.');

            // 비동기로 백엔드 재기동 실행 (응답 후 실행)
            setTimeout(async () => {
              try {
                logInfo('백엔드 재기동 요청됨 - 컨테이너 재시작을 시도합니다.');

                // Docker 컨테이너 재시작 시도
                try {
                  // 현재 컨테이너 ID 가져오기
                  const containerId = process.env.HOSTNAME || 'bushub-backend';
                  await execAsyncBackend(`docker restart ${containerId}`);
                  logInfo(`백엔드 컨테이너 재시작 성공: ${containerId}`);
                } catch (dockerError) {
                  logInfo(`Docker 재시작 시도 실패: ${dockerError}`);

                  // Docker 명령이 실패하면 프로세스 종료로 폴백
                  logInfo('프로세스 종료로 백엔드 재시작을 시도합니다.');
                  process.exit(0);
                }
              } catch (error) {
                logInfo(`백엔드 재기동 실행 중 오류: ${error}`);
              }
            }, 1000);

            return reply.send(
              createSuccessResponse('백엔드 재기동 요청이 접수되었습니다. 잠시 후 서비스가 재시작됩니다.'),
            );
          } catch (error) {
            logInfo(`백엔드 재기동 요청 중 오류: ${error}`);
            return handleHttpError(new HttpSystemError('백엔드 재기동 실행 중 오류가 발생했습니다.'), reply);
          }

        default:
          return handleHttpError(new HttpValidationError('지원하지 않는 action입니다.'), reply);
      }
    } catch (error) {
      logInfo('[POST /system] 에러 발생');
      return handleHttpError(new HttpSystemError('시스템 명령 실행 중 오류'), reply);
    }
  });

  // 시스템 모드 전환 (자동/수동)
  app.post(
    SYSTEM_GENERAL_ENDPOINTS.SYSTEM_MODE,
    {
      preHandler: [app.requireAuth],
      schema: {
        description: '시스템 모드 전환 (자동/수동)',
        tags: ['System'],
        body: SystemModeRequestSchema,
        response: {
          200: SystemModeResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { mode } = request.body as { mode: 'auto' | 'manual' };

        logInfo(`[POST /system/mode] 시스템 모드 변경 요청: ${mode}`);

        const result = await systemService.updateSystemMode(mode);

        logInfo(`[POST /system/mode] 시스템 모드 변경 완료: ${mode}`);

        return reply.send(createSuccessResponse(`시스템이 ${result.modeText} 모드로 전환되었습니다.`, result));
      } catch (error) {
        logInfo('[POST /system/mode] 에러 발생');
        return handleHttpError(new HttpSystemError('시스템 모드 변경 중 오류'), reply);
      }
    },
  );

  // 폴링 간격 조회
  app.get(
    SYSTEM_GENERAL_ENDPOINTS.SYSTEM_POLLING_INTERVAL,
    {
      preHandler: [app.requireAuth],
      schema: {
        description: '현재 폴링 간격 조회',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  pollingInterval: { type: 'number' },
                  pollingIntervalText: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        logInfo('[GET /system/polling/interval] 폴링 간격 조회 요청');

        const settings = await systemService.getSettings();
        const pollingInterval = settings?.runtime?.pollingInterval || 20000;

        const pollingIntervalText = (() => {
          if (pollingInterval < 1000) return `${pollingInterval}ms`;
          if (pollingInterval < 60000) return `${pollingInterval / 1000}초`;
          return `${pollingInterval / 60000}분`;
        })();

        logInfo(`[GET /system/polling/interval] 폴링 간격 조회 완료: ${pollingIntervalText}`);

        return reply.send({
          success: true,
          message: '폴링 간격 조회 성공',
          data: {
            pollingInterval,
            pollingIntervalText,
          },
        });
      } catch (error) {
        logInfo('[GET /system/polling/interval] 에러 발생');
        return handleHttpError(new HttpSystemError('폴링 간격 조회 중 오류'), reply);
      }
    },
  );

  // 폴링 간격 설정
  app.post(
    SYSTEM_GENERAL_ENDPOINTS.SYSTEM_POLLING_INTERVAL,
    {
      preHandler: [app.requireAuth],
      schema: {
        description: '폴링 간격 설정',
        tags: ['System'],
        body: {
          type: 'object',
          required: ['pollingInterval'],
          properties: {
            pollingInterval: {
              type: 'number',
              minimum: 100,
              maximum: 3600000,
              description: '폴링 간격 (밀리초, 100ms ~ 1시간)',
            },
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
                  pollingInterval: { type: 'number' },
                  pollingIntervalText: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { pollingInterval } = request.body as { pollingInterval: number };

        logInfo(`[POST /system/polling/interval] 폴링 간격 설정 요청: ${pollingInterval}ms`);

        // 폴링 간격 유효성 검사
        if (pollingInterval < 100 || pollingInterval > 3600000) {
          return handleHttpError(
            new HttpValidationError('폴링 간격은 100ms ~ 1시간(3600000ms) 사이여야 합니다.'),
            reply,
          );
        }

        await systemService.updatePollingInterval(pollingInterval);

        const pollingIntervalText = (() => {
          if (pollingInterval < 1000) return `${pollingInterval}ms`;
          if (pollingInterval < 60000) return `${pollingInterval / 1000}초`;
          return `${pollingInterval / 60000}분`;
        })();

        logInfo(`[POST /system/polling/interval] 폴링 간격 설정 완료: ${pollingIntervalText}`);

        // 폴링 간격 변경 성공 시 WebSocket으로 알림
        webSocketService?.broadcastLog('info', 'api', `폴링 간격이 ${pollingIntervalText}로 변경되었습니다.`);

        return reply.send({
          success: true,
          message: '폴링 간격 설정 성공',
          data: {
            pollingInterval,
            pollingIntervalText,
            message: `폴링 간격이 ${pollingIntervalText}로 설정되었습니다.`,
          },
        });
      } catch (error) {
        logInfo('[POST /system/polling/interval] 에러 발생');
        return handleHttpError(new HttpSystemError('폴링 간격 설정 중 오류'), reply);
      }
    },
  );

  // GET /system/schema (시스템 설정 API 스키마)
  app.get(SYSTEM_GENERAL_ENDPOINTS.SYSTEM_SCHEMA, { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      reply.send(
        createSuccessResponse('시스템 설정 API 스키마', {
          settingsResponseSchema: SystemSettingsResponseSchema,
          settingsResponseExample: SYSTEM_SETTINGS_RESPONSE_EXAMPLE,
          settingsUpdateRequestSchema: SystemSettingsUpdateRequestSchema,
          settingsUpdateRequestExample: SYSTEM_SETTINGS_UPDATE_REQUEST_EXAMPLE,
          modeRequestSchema: SystemModeRequestSchema,
          modeRequestExample: SYSTEM_MODE_REQUEST_EXAMPLE,
          modeResponseSchema: SystemModeResponseSchema,
          modeResponseExample: SYSTEM_MODE_RESPONSE_EXAMPLE,
          description: '시스템 설정 관리 API의 요청/응답 구조입니다.',
          endpoints: [
            {
              path: '/api/v1/internal/system',
              method: 'GET',
              description: '시스템 설정 조회',
            },
            {
              path: '/api/v1/internal/system',
              method: 'POST',
              description: '시스템 설정 조회',
            },
            {
              path: '/api/v1/internal/system/mode',
              method: 'POST',
              description: '시스템 모드 전환',
            },
          ],
        }),
      );
    } catch (error) {
      return handleHttpError(new HttpSystemError('시스템 설정 스키마 조회 실패'), reply);
    }
  });


  // GET /system/domain/status (System 도메인 서비스 상태 조회)
  app.get(SYSTEM_GENERAL_ENDPOINTS.SYSTEM_DOMAIN_STATUS, { preHandler: [app.requireAuth] }, async (request, reply) => {
    try {
      logInfo('[GET /system/domain/status] System 도메인 서비스 상태 조회 요청');

      const systemDomainStatus = {
        systemService: {
          available: !!systemService,
          status: 'active',
        },

        logSchedulerService: {
          available: !!logSchedulerService,
          status: 'active',
        },
        webSocketService: {
          available: !!webSocketService,
          status: 'active',
        },
        unifiedLogService: {
          available: !!unifiedLogService,
          status: 'active',
        },
        timestamp: new Date().toISOString(),
      };

      reply.send(
        createSuccessResponse('System 도메인 서비스 상태 조회 성공', {
          domain: 'System',
          services: systemDomainStatus,
          description: 'System 도메인의 모든 서비스 상태 정보입니다.',
          usage: '/api/v1/internal/system/domain/status',
        }),
      );
    } catch (error) {
      return handleHttpError(new HttpSystemError('System 도메인 서비스 상태 조회 실패'), reply);
    }
  });

  // GET /system/current-mode-status 엔드포인트 제거됨

  // POST /system/ping-test (Ping 테스트)
  app.post(
    SYSTEM_GENERAL_ENDPOINTS.SYSTEM_PING_TEST,
    {
      preHandler: [app.requireAuth],
      schema: {
        description: 'Ping 테스트 실행',
        tags: ['System'],
        body: {
          type: 'object',
          required: ['ip'],
          properties: {
            ip: {
              type: 'string',
              pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
              description: '테스트할 IP 주소 (IPv4)',
            },
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
                  ip: { type: 'string' },
                  success: { type: 'boolean' },
                  responseTime: { type: 'number' },
                  packetLoss: { type: 'number' },
                  minTime: { type: 'number' },
                  maxTime: { type: 'number' },
                  avgTime: { type: 'number' },
                  packetsTransmitted: { type: 'number' },
                  packetsReceived: { type: 'number' },
                  rawOutput: { type: 'string' },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { ip } = request.body as { ip: string };

        logInfo(`[POST /system/ping-test] Ping 테스트 요청: ${ip}`);

        // IP 주소 검증 (추가 보안)
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
          return handleHttpError(new HttpValidationError('유효하지 않은 IP 주소 형식입니다.'), reply);
        }

        // 위험한 IP 주소 차단 (로컬 시스템 보호)
        const dangerousIPs = ['127.0.0.1', 'localhost', '0.0.0.0'];
        if (dangerousIPs.includes(ip)) {
          return handleHttpError(new HttpValidationError('로컬 시스템 IP는 테스트할 수 없습니다.'), reply);
        }

        const execAsync = promisify(exec);

        try {
          // 운영체제별 ping 명령어 구성
          let pingCommand: string;
          if (process.platform === 'win32') {
            // Windows: ping -n 1 -w 5000 IP
            pingCommand = `ping -n 1 -w 5000 ${ip}`;
          } else {
            // Linux/Mac: ping -c 1 -W 5 IP
            pingCommand = `ping -c 1 -W 5 ${ip}`;
          }

          logInfo(`[POST /system/ping-test] 실행 명령어: ${pingCommand}`);

          // ping 실행 (타임아웃 10초)
          const { stdout, stderr } = await Promise.race([
            execAsync(pingCommand),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Ping 테스트 타임아웃 (10초)')), 10000);
            }),
          ]);

          // ping 결과 파싱
          const pingResult = parsePingOutput(stdout, ip);

          logInfo(`[POST /system/ping-test] Ping 테스트 완료: ${ip} - 성공: ${pingResult.success}`);

          return reply.send(
            createSuccessResponse('Ping 테스트가 완료되었습니다.', {
              ip,
              success: pingResult.success,
              responseTime: pingResult.responseTime,
              packetLoss: pingResult.packetLoss,
              minTime: pingResult.minTime,
              maxTime: pingResult.maxTime,
              avgTime: pingResult.avgTime,
              packetsTransmitted: pingResult.packetsTransmitted,
              packetsReceived: pingResult.packetsReceived,
              rawOutput: stdout,
              timestamp: new Date().toISOString(),
            }),
          );
        } catch (execError) {
          logInfo(`[POST /system/ping-test] Ping 실행 실패: ${execError}`);

          // ping 실패 시에도 결과 반환
          return reply.send({
            success: false,
            message: 'Ping 테스트 실패',
            data: {
              ip,
              success: false,
              responseTime: 0,
              packetLoss: 100,
              minTime: 0,
              maxTime: 0,
              avgTime: 0,
              packetsTransmitted: 1,
              packetsReceived: 0,
              rawOutput: execError instanceof Error ? execError.message : String(execError),
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        logInfo('[POST /system/ping-test] 에러 발생');
        return handleHttpError(new HttpSystemError('Ping 테스트 실행 중 오류'), reply);
      }
    },
  );
}

// Ping 출력 파싱 함수
function parsePingOutput(
  output: string,
  ip: string,
): {
  success: boolean;
  responseTime: number;
  packetLoss: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  packetsTransmitted: number;
  packetsReceived: number;
} {
  try {
    if (process.platform === 'win32') {
      // Windows ping 출력 파싱
      const lines = output.split('\n');
      const statsLine = lines.find((line) => line.includes('패킷: 보냄') || line.includes('Packets: Sent'));

      if (!statsLine) {
        // 기본값 반환 (연결 실패)
        return {
          success: false,
          responseTime: 0,
          packetLoss: 100,
          minTime: 0,
          maxTime: 0,
          avgTime: 0,
          packetsTransmitted: 1,
          packetsReceived: 0,
        };
      }

      // 패킷 통계 추출
      const transmittedMatch = statsLine.match(/(\d+).*보냄|(\d+).*Sent/);
      const receivedMatch = statsLine.match(/(\d+).*받음|(\d+).*Received/);
      const lossMatch = statsLine.match(/(\d+)%.*손실|(\d+)%.*Lost/);

      const transmitted = transmittedMatch ? parseInt(transmittedMatch[1] || transmittedMatch[2]) : 4;
      const received = receivedMatch ? parseInt(receivedMatch[1] || receivedMatch[2]) : 0;
      const loss = lossMatch ? parseInt(lossMatch[1] || lossMatch[2]) : 100;

      // 응답 시간 추출 (Windows)
      const timeLines = lines.filter((line) => line.includes('시간') || line.includes('time'));
      const times: number[] = [];

      timeLines.forEach((line) => {
        const timeMatch = line.match(/시간[<=](\d+)ms|time[<=](\d+)ms/);
        if (timeMatch) {
          times.push(parseInt(timeMatch[1] || timeMatch[2]));
        }
      });

      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const minTime = times.length > 0 ? Math.min(...times) : 0;
      const maxTime = times.length > 0 ? Math.max(...times) : 0;

      return {
        success: received > 0,
        responseTime: avgTime,
        packetLoss: loss,
        minTime,
        maxTime,
        avgTime,
        packetsTransmitted: transmitted,
        packetsReceived: received,
      };
    } else {
      // Linux/Mac ping 출력 파싱
      const lines = output.split('\n');
      const statsLine = lines.find((line) => line.includes('packets transmitted') || line.includes('패킷 전송'));

      if (!statsLine) {
        // 기본값 반환 (연결 실패)
        return {
          success: false,
          responseTime: 0,
          packetLoss: 100,
          minTime: 0,
          maxTime: 0,
          avgTime: 0,
          packetsTransmitted: 1,
          packetsReceived: 0,
        };
      }

      // 패킷 통계 추출 (더 유연한 정규식 사용)
      const transmittedMatch = statsLine.match(/(\d+)\s+packets?\s+transmitted|(\d+)\s+패킷\s+전송/);
      const receivedMatch = statsLine.match(/(\d+)\s+packets?\s+received|(\d+)\s+받음|(\d+)\s+received/);
      const lossMatch = statsLine.match(/(\d+)%\s+packet\s+loss|(\d+)%\s+패킷\s+손실/);

      const transmitted = transmittedMatch ? parseInt(transmittedMatch[1] || transmittedMatch[2] || '1') : 1;
      const received = receivedMatch ? parseInt(receivedMatch[1] || receivedMatch[2] || receivedMatch[3] || '0') : 0;
      const loss = lossMatch ? parseInt(lossMatch[1] || lossMatch[2] || '100') : 100;

      // 응답 시간 통계 추출 (rtt와 round-trip 모두 지원, mdev는 선택적)
      const timeStatsLine = lines.find(
        (line) =>
          line.includes('rtt min/avg/max') ||
          line.includes('round-trip min/avg/max') ||
          line.includes('시간 min/avg/max'),
      );
      let minTime = 0,
        maxTime = 0,
        avgTime = 0;

      if (timeStatsLine) {
        // rtt 또는 round-trip 형식 지원, mdev는 선택적
        const timeMatch = timeStatsLine.match(
          /(?:rtt|round-trip|시간)\s+min\/avg\/max(?:\/mdev)?\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)(?:\/([\d.]+))?\s*ms/,
        );
        if (timeMatch) {
          minTime = parseFloat(timeMatch[1]);
          avgTime = parseFloat(timeMatch[2]);
          maxTime = parseFloat(timeMatch[3]);
        }
      }

      return {
        success: received > 0,
        responseTime: avgTime,
        packetLoss: loss,
        minTime,
        maxTime,
        avgTime,
        packetsTransmitted: transmitted,
        packetsReceived: received,
      };
    }
  } catch (error) {
    // 파싱 실패 시 기본값 반환
    return {
      success: false,
      responseTime: 0,
      packetLoss: 100,
      minTime: 0,
      maxTime: 0,
      avgTime: 0,
      packetsTransmitted: 1,
      packetsReceived: 0,
    };
  }
}
