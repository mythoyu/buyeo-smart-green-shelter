import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { HW_PORTS } from '../../../meta/hardware/ports';
import { createSuccessResponse, createErrorResponse } from '../../../shared/utils/responseHelper';
import {
  executeHardwarePortWrite,
  resolveBulkDefaultPorts,
} from '../../../shared/utils/hardwarePortWrite';
import {
  BENCH_READ_COMMANDS,
  BenchReadCommand,
  BENCH_READ_GAP_MS,
  buildBenchFieldReading,
  delayMs,
  encodeBenchContTemp,
  encodeBenchTempCheckInterval,
  encodeBenchTempOffset,
  toModbusRegisterWord,
} from '../../../shared/utils/benchModbus';
import {
  collectBenchReadRefs,
  collectDdcTimeReadRefs,
  collectSeasonalReadRefs,
  createHardwareModbusReader,
  executeHardwareModbusBulkRead,
  executeHardwareReadAllStatus,
  readFirstValue,
} from '../../../shared/utils/hardwareBulkRead';
import { executeHardwareBulkCommandWrite } from '../../../shared/utils/hardwareBulkWrite';
import { logError, logDebug } from '../../../logger';

/** 최근 선택 클라이언트 ID — Modbus 역색인·삼성 cooler 변환에 전달 */
async function resolveHardwareClientId(): Promise<string | undefined> {
  try {
    const { Client } = await import('../../../models/schemas/ClientSchema');
    const doc = await Client.findOne({}).sort({ createdAt: -1 }).select('id').lean<{ id: string }>();
    return doc?.id;
  } catch {
    return undefined;
  }
}

// 하드웨어 직접 제어 요청 타입
interface HardwareDirectCommandRequest {
  port: string;
  command: string;
  value: boolean | number;
}

interface HardwareBulkCommandRequest {
  command: string;
  value: boolean | number;
  ports?: string[];
}

// 하드웨어 직접 제어 응답 타입
interface HardwareDirectCommandResponse {
  success: boolean;
  message: string;
  data?: {
    commandId: string;
    value: number | boolean | null;
  };
}

// 하드웨어 상태 읽기 요청 타입
interface HardwareReadStatusRequest {
  port: string;
  command: string;
}

// 하드웨어 상태 읽기 응답 타입
interface HardwareReadStatusResponse {
  success: boolean;
  message: string;
  data?: {
    commandId: string;
    values: number[];
  };
}

// 하드웨어 전체 상태 읽기 요청 타입
interface HardwareReadAllStatusRequest {
  commands: string[];
}

// 하드웨어 전체 상태 읽기 응답 타입
interface HardwareReadAllStatusResponse {
  success: boolean;
  message: string;
  data?: {
    [port: string]: {
      [command: string]: number[];
    };
  };
}

/**
 * 하드웨어 직접 제어 라우트
 */
async function hardwareRoutes(fastify: FastifyInstance) {
  // ==================== 새 단순 엔드포인트: 시스템/계절 ====================
  fastify.post('/hardware/system/seasonal', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body as Record<string, unknown>) || {};
      const action = String(body.action || '').toLowerCase();

      const serviceContainer = ServiceContainer.getInstance();
      const modbusReader = createHardwareModbusReader(serviceContainer.getUnifiedModbusService());

      if (action === 'read') {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const { results, transactionCount } = await executeHardwareModbusBulkRead(
          modbusReader,
          collectSeasonalReadRefs(),
        );
        logDebug(`[HardwareSeasonal] bulk read 완료 (transactions=${transactionCount})`);

        const monthly: Record<string, boolean> = {};
        for (const m of months) {
          const v = readFirstValue(results, 'SEASONAL', `MONTHLY_SUMMER_${m}`);
          monthly[m] = v === 1;
        }
        const seasonVal = readFirstValue(results, 'SEASONAL', 'SEASON');

        return reply.code(200).send(
          createSuccessResponse('계절 설정 조회 성공', {
            season: seasonVal === 1,
            monthlySummer: monthly,
          }),
        );
      }

      if (action === 'set') {
        if (typeof body.season === 'boolean') {
          return reply
            .code(400)
            .send(
              createErrorResponse(
                'INVALID_PARAM',
                '현재 계절(SEASON)은 읽기 전용입니다. 월별 하절기만 설정할 수 있습니다.',
              ),
            );
        }
        const monthly = (body.monthlySummer || {}) as Record<string, boolean>;

        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        for (const m of months) {
          if (m in monthly) {
            const hw = (HW_PORTS as Record<string, Record<string, Record<string, { set?: { functionCode: number; address: number } }>>>)
              .SEASONAL?.MONTHLY_SUMMER?.[m]?.set;
            if (hw) {
              const numeric = monthly[m] ? 1 : 0;
              const r = await modbusReader.executeQueuedCommand({
                type: 'write',
                functionCode: hw.functionCode,
                address: hw.address,
                lengthOrValue: numeric,
                priority: 'high',
              });
              if (!r?.success) return reply.code(500).send(createErrorResponse('COMMAND_FAILED', `${m} 설정 실패`));
            }
          }
        }
        return reply.code(200).send(createSuccessResponse('계절 설정 적용 성공'));
      }

      return reply.code(400).send(createErrorResponse('INVALID_PARAM', 'action은 read 또는 set 이어야 합니다.'));
    } catch (error) {
      return reply
        .code(500)
        .send(
          createErrorResponse(
            'INTERNAL_ERROR',
            `계절 설정 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  });

  // ==================== 새 단순 엔드포인트: 시스템/DDC 시간 ====================
  fastify.post('/hardware/system/ddc-time', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body as Record<string, unknown>) || {};
      const action = String(body.action || '').toLowerCase();

      const serviceContainer = ServiceContainer.getInstance();
      const pollingService = serviceContainer.getUnifiedModbusPollerService();
      if (pollingService.isPollingActive()) {
        return reply
          .code(409)
          .send(
            createErrorResponse(
              'COMMAND_FAILED',
              '폴링이 활성화되어 있어 하드웨어 직접 제어가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
            ),
          );
      }

      const modbusReader = createHardwareModbusReader(serviceContainer.getUnifiedModbusService());

      const writeDdc = async (command: string, value: number) => {
        const hw = (HW_PORTS as Record<string, Record<string, { set?: { functionCode: number; address: number } }>>)
          .DDC_TIME?.[command]?.set;
        if (!hw) {
          return false;
        }
        const result = await modbusReader.executeQueuedCommand({
          type: 'write',
          functionCode: hw.functionCode,
          address: hw.address,
          lengthOrValue: value,
          priority: 'high',
        });
        return !!result?.success;
      };

      if (action === 'read') {
        const { results, transactionCount } = await executeHardwareModbusBulkRead(
          modbusReader,
          collectDdcTimeReadRefs(),
        );
        logDebug(`[HardwareDdcTime] bulk read 완료 (transactions=${transactionCount})`);

        const year = readFirstValue(results, 'DDC_TIME', 'YEAR');
        const month = readFirstValue(results, 'DDC_TIME', 'MONTH');
        const day = readFirstValue(results, 'DDC_TIME', 'DAY');
        const dow = readFirstValue(results, 'DDC_TIME', 'DOW');
        const hour = readFirstValue(results, 'DDC_TIME', 'HOUR');
        const minute = readFirstValue(results, 'DDC_TIME', 'MIN');
        const second = readFirstValue(results, 'DDC_TIME', 'SECOND');

        if ([year, month, day, hour, minute, second].some(v => v === null)) {
          return reply.code(500).send(createErrorResponse('COMMAND_FAILED', 'DDC 시간 읽기 실패'));
        }

        return reply.code(200).send(
          createSuccessResponse('DDC 시간 조회 성공', {
            year: year!,
            month: month!,
            day: day!,
            dow: dow ?? 0,
            hour: hour!,
            minute: minute!,
            second: second!,
          }),
        );
      }

      if (action === 'set') {
        const fields: Array<{ command: string; value: number | undefined }> = [
          { command: 'YEAR', value: body.year !== undefined ? Number(body.year) : undefined },
          { command: 'MONTH', value: body.month !== undefined ? Number(body.month) : undefined },
          { command: 'DAY', value: body.day !== undefined ? Number(body.day) : undefined },
          { command: 'DOW', value: body.dow !== undefined ? Number(body.dow) : undefined },
          { command: 'HOUR', value: body.hour !== undefined ? Number(body.hour) : undefined },
          { command: 'MIN', value: body.minute !== undefined ? Number(body.minute) : undefined },
          { command: 'SECOND', value: body.second !== undefined ? Number(body.second) : undefined },
        ];

        for (const field of fields) {
          if (field.value === undefined || Number.isNaN(field.value)) {
            continue;
          }
          const ok = await writeDdc(field.command, field.value);
          if (!ok) {
            return reply.code(500).send(createErrorResponse('COMMAND_FAILED', `${field.command} 설정 실패`));
          }
        }
        return reply.code(200).send(createSuccessResponse('DDC 시간 설정 적용 성공'));
      }

      return reply.code(400).send(createErrorResponse('INVALID_PARAM', 'action은 read 또는 set 이어야 합니다.'));
    } catch (error) {
      return reply
        .code(500)
        .send(
          createErrorResponse(
            'INTERNAL_ERROR',
            `DDC 시간 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  });

  // ==================== 온열벤치 (BENCH) ====================
  fastify.post('/hardware/system/bench', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body as Record<string, unknown>) || {};
      const action = String(body.action || '').toLowerCase();

      const serviceContainer = ServiceContainer.getInstance();
      const pollingService = serviceContainer.getUnifiedModbusPollerService();
      if (pollingService.isPollingActive()) {
        return reply
          .code(409)
          .send(
            createErrorResponse(
              'COMMAND_FAILED',
              '폴링이 활성화되어 있어 하드웨어 직접 제어가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
            ),
          );
      }

      const modbusReader = createHardwareModbusReader(serviceContainer.getUnifiedModbusService());

      const readCmd = async (command: BenchReadCommand) => {
        const hw = (HW_PORTS as Record<string, Record<string, { get?: { functionCode: number; address: number } }>>)
          .BENCH?.[command]?.get;
        if (!hw) return null;
        const result = await modbusReader.executeQueuedCommand({
          type: 'read',
          functionCode: hw.functionCode,
          address: hw.address,
          lengthOrValue: 1,
          priority: 'high',
          skipPersistence: true,
        });
        if (!result?.success) return null;
        return Array.isArray(result.data) ? Number(result.data[0]) : Number(result.data);
      };

      const writeCmd = async (command: string, value: number) => {
        const hw = (HW_PORTS as Record<string, Record<string, { set?: { functionCode: number; address: number } }>>)
          .BENCH?.[command]?.set;
        if (!hw) return false;
        const wireValue = toModbusRegisterWord(value);
        const result = await modbusReader.executeQueuedCommand({
          type: 'write',
          functionCode: hw.functionCode,
          address: hw.address,
          lengthOrValue: wireValue,
          valueIsRawRegister: true,
          priority: 'high',
        });
        return !!result?.success;
      };

      if (action === 'read') {
        const { results, transactionCount } = await executeHardwareModbusBulkRead(modbusReader, collectBenchReadRefs());
        logDebug(`[HardwareBench] bulk read 완료 (transactions=${transactionCount})`);

        const values: Partial<Record<BenchReadCommand, number | null>> = {};
        for (const command of BENCH_READ_COMMANDS) {
          values[command] = readFirstValue(results, 'BENCH', command);
        }

        const failed = BENCH_READ_COMMANDS.filter(command => values[command] === null);
        if (failed.length > 0) {
          return reply
            .code(500)
            .send(createErrorResponse('COMMAND_FAILED', `온열벤치 읽기 실패: ${failed.join(', ')}`));
        }

        return reply.code(200).send(
          createSuccessResponse('온열벤치 설정 조회 성공', {
            cur_temp: buildBenchFieldReading('CUR_TEMP', values.CUR_TEMP!),
            cur_temp_2: buildBenchFieldReading('CUR_TEMP_2', values.CUR_TEMP_2!),
            cont_temp: buildBenchFieldReading('CONT_TEMP', values.CONT_TEMP!),
            cont_temp_2: buildBenchFieldReading('CONT_TEMP_2', values.CONT_TEMP_2!),
            temp_offset: buildBenchFieldReading('TEMP_OFFSET', values.TEMP_OFFSET!),
            temp_check_interval: buildBenchFieldReading('TEMP_CHECK_INTERVAL', values.TEMP_CHECK_INTERVAL!),
          }),
        );
      }

      if (action === 'set') {
        const writes: Array<{ command: string; value: number }> = [];

        if (body.cont_temp !== undefined && body.cont_temp !== null) {
          writes.push({ command: 'CONT_TEMP', value: encodeBenchContTemp(Number(body.cont_temp)) });
        }
        if (body.cont_temp_2 !== undefined && body.cont_temp_2 !== null) {
          writes.push({ command: 'CONT_TEMP_2', value: encodeBenchContTemp(Number(body.cont_temp_2)) });
        }
        if (body.temp_offset !== undefined && body.temp_offset !== null) {
          writes.push({ command: 'TEMP_OFFSET', value: encodeBenchTempOffset(Number(body.temp_offset)) });
        }
        if (body.temp_check_interval !== undefined && body.temp_check_interval !== null) {
          writes.push({
            command: 'TEMP_CHECK_INTERVAL',
            value: encodeBenchTempCheckInterval(Number(body.temp_check_interval)),
          });
        }

        if (writes.length === 0) {
          return reply.code(400).send(createErrorResponse('INVALID_PARAM', '설정할 항목이 없습니다.'));
        }

        for (let i = 0; i < writes.length; i += 1) {
          const { command, value } = writes[i];
          const ok = await writeCmd(command, value);
          if (!ok) {
            return reply.code(500).send(createErrorResponse('COMMAND_FAILED', `${command} 설정 실패`));
          }
          if (i < writes.length - 1) {
            await delayMs(BENCH_READ_GAP_MS);
          }
        }

        const verifyValues: Partial<Record<BenchReadCommand, number | null>> = {};
        for (const command of BENCH_READ_COMMANDS) {
          verifyValues[command] = await readCmd(command);
        }
        const verifyFailed = BENCH_READ_COMMANDS.filter(command => verifyValues[command] === null);

        const responseData: Record<string, unknown> = {
          written: writes.map(({ command, value }) => ({ command, register: value })),
        };
        if (verifyFailed.length === 0) {
          responseData.read_after_set = {
            cont_temp: buildBenchFieldReading('CONT_TEMP', verifyValues.CONT_TEMP!),
            cont_temp_2: buildBenchFieldReading('CONT_TEMP_2', verifyValues.CONT_TEMP_2!),
            temp_offset: buildBenchFieldReading('TEMP_OFFSET', verifyValues.TEMP_OFFSET!),
            temp_check_interval: buildBenchFieldReading(
              'TEMP_CHECK_INTERVAL',
              verifyValues.TEMP_CHECK_INTERVAL!,
            ),
          };
        }

        return reply.code(200).send(createSuccessResponse('온열벤치 설정 적용 성공', responseData));
      }

      return reply.code(400).send(createErrorResponse('INVALID_PARAM', 'action은 read 또는 set 이어야 합니다.'));
    } catch (error) {
      logError(`[HardwareBench] 오류: ${error}`);
      return reply
        .code(500)
        .send(
          createErrorResponse(
            'INTERNAL_ERROR',
            `온열벤치 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  });

  /**
   * 하드웨어 직접 제어 명령 실행
   * POST /hardware/direct-command
   */
  fastify.post<{
    Body: HardwareDirectCommandRequest;
    Reply: HardwareDirectCommandResponse;
  }>(
    '/hardware/direct-command',
    async (request: FastifyRequest<{ Body: HardwareDirectCommandRequest }>, reply: FastifyReply) => {
      try {
        const { port, command, value } = request.body;
        logDebug(`[HardwareDirectCommand] 요청 파싱 성공: port=${port}, command=${command}, value=${value}`);
        logDebug(`[HardwareDirectCommand] 요청 시작: ${port}/${command} = ${value}`);
        logDebug(`[HardwareDirectCommand] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        const hardwareClientId = await resolveHardwareClientId();
        logDebug(`[HardwareDirectCommand] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logDebug(`[HardwareDirectCommand] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logDebug(`[HardwareDirectCommand] 폴링 상태: ${isPollingActive}`);

        if (isPollingActive) {
          fastify.log.warn(`[HardwareDirectCommand] 폴링 활성화 상태로 하드웨어 직접 제어 거부`);
          return reply
            .code(409)
            .send(
              createErrorResponse(
                'COMMAND_FAILED',
                '폴링이 활성화되어 있어 하드웨어 직접 제어가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
              ),
            );
        }

        // 2. HW_PORTS에서 실제 Modbus 정보 가져오기
        logDebug(`[HardwareDirectCommand] HW_PORTS 조회 시도: ${port}.${command}.set`);
        const hwPort = (HW_PORTS as any)[port]?.[command]?.set;
        logDebug(`[HardwareDirectCommand] HW_PORTS 조회 결과:`, hwPort);

        if (!hwPort) {
          logError(`[HardwareDirectCommand] 지원하지 않는 포트/명령: ${port}/${command}`);
          logError(`[HardwareDirectCommand] 사용 가능한 포트:`, Object.keys(HW_PORTS));
          if ((HW_PORTS as any)[port]) {
            logError(`[HardwareDirectCommand] 포트 ${port}의 사용 가능한 명령:`, Object.keys((HW_PORTS as any)[port]));
          }
          return reply
            .code(400)
            .send(createErrorResponse('INVALID_PARAM', `지원하지 않는 포트/명령 조합입니다: ${port}/${command}`));
        }

        logDebug(
          `[HardwareDirectCommand] HW_PORTS 정보: FC=${hwPort.functionCode}, Address=${hwPort.address}, Description=${hwPort.description}`,
        );

        // 3. UnifiedModbusCommunicationService를 통한 직접 Modbus 명령 실행
        const modbusService = serviceContainer.getUnifiedModbusCommunicationService();

        // ModbusCommand 객체 생성
        // boolean → number, string 숫자 → number로 안전 변환
        let numericValue: number | undefined;
        if (typeof value === 'boolean') {
          numericValue = value ? 1 : 0;
        } else if (typeof value === 'string') {
          const parsed = Number(value);
          if (Number.isNaN(parsed)) {
            return reply
              .code(400)
              .send(createErrorResponse('INVALID_PARAM', `value가 숫자가 아닙니다: ${String(value)}`));
          }
          numericValue = parsed;
        } else {
          numericValue = value as number;
        }

        const modbusCommand = {
          id: `hardware_direct_${Date.now()}`,
          type: 'write' as const,
          unitId: '1', // 기본 slaveId
          functionCode: hwPort.functionCode,
          address: hwPort.address,
          lengthOrValue: numericValue,
          priority: 'high' as const,
          timestamp: new Date(),
          resolve: () => {},
          reject: () => {},
          ...(hardwareClientId !== undefined ? { clientId: hardwareClientId } : {}),
        };

        const result = await modbusService.executeDirect(modbusCommand);

        if (!result || result.success !== true) {
          logError(`[HardwareDirectCommand] Modbus 통신 실패: ${result?.error ?? 'Unknown error'}`);
          return reply
            .code(500)
            .send(createErrorResponse('COMMAND_FAILED', `하드웨어 통신 실패: ${result?.error ?? 'Unknown error'}`));
        }

        logDebug(`[HardwareDirectCommand] 성공: ${port}/${command} = ${value}, CommandID=${modbusCommand.id}`);

        // Modbus 통신 성공 시, 실제 전송한 값을 응답에 포함
        return reply.code(200).send(
          createSuccessResponse('하드웨어 직접 제어 성공', {
            commandId: modbusCommand.id,
            value: value, // 실제 전송한 값 반환
          }),
        );
      } catch (error) {
        logError(`[HardwareDirectCommand] 예상치 못한 오류 발생:`);
        logError(`[HardwareDirectCommand] 오류 타입: ${typeof error}`);
        logError(`[HardwareDirectCommand] 오류 메시지: ${error instanceof Error ? error.message : String(error)}`);
        logError(`[HardwareDirectCommand] 오류 스택:`, error instanceof Error ? error.stack : 'No stack trace');
        logError(`[HardwareDirectCommand] 전체 오류 객체:`, error);

        // 표준 에러 응답
        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              `하드웨어 제어 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      }
    },
  );

  /**
   * 하드웨어 상태 읽기
   * POST /hardware/read-status
   */
  fastify.post<{
    Body: HardwareReadStatusRequest;
    Reply: HardwareReadStatusResponse;
  }>(
    '/hardware/read-status',
    async (request: FastifyRequest<{ Body: HardwareReadStatusRequest }>, reply: FastifyReply) => {
      try {
        const { port, command } = request.body;
        logDebug(`[HardwareReadStatus] 요청 파싱 성공: port=${port}, command=${command}`);
        logDebug(`[HardwareReadStatus] 요청 시작: ${port}/${command}`);
        logDebug(`[HardwareReadStatus] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        const hardwareClientId = await resolveHardwareClientId();
        logDebug(`[HardwareReadStatus] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logDebug(`[HardwareReadStatus] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logDebug(`[HardwareReadStatus] 폴링 상태: ${isPollingActive}`);

        if (isPollingActive) {
          fastify.log.warn(`[HardwareReadStatus] 폴링 활성화 상태로 하드웨어 상태 읽기 거부`);
          return reply
            .code(409)
            .send(
              createErrorResponse(
                'COMMAND_FAILED',
                '폴링이 활성화되어 있어 하드웨어 상태 읽기가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
              ),
            );
        }

        // 2. 포트/명령 별칭 해석 (프론트 단순화용 그룹명을 백엔드 실제 포트로 매핑)
        let resolvedPort = port;
        let resolvedCommand = command;

        // SENSOR → INTEGRATED_SENSOR (읽기 전용 그룹 별칭)
        if (resolvedPort === 'SENSOR') {
          resolvedPort = 'INTEGRATED_SENSOR';
        }

        // DI_STATUS/DIx 형태 처리 (프론트엔드 호출 방식)
        if (resolvedPort === 'DI_STATUS' && /^DI\d{1,2}$/.test(resolvedCommand)) {
          // DI_STATUS/DI1 → DI_STATUS.DI1 형태로 유지 (이미 올바른 형태)
          // resolvedPort와 resolvedCommand는 그대로 사용
        }
        // DIx/STATUS → DI_STATUS/DIx (호환 별칭)
        else if (/^DI\d{1,2}$/.test(resolvedPort) && resolvedCommand === 'STATUS') {
          resolvedCommand = resolvedPort; // ex) 'DI16'
          resolvedPort = 'DI_STATUS';
        }

        // 3. HW_PORTS에서 실제 Modbus 읽기 정보 가져오기
        logDebug(`[HardwareReadStatus] HW_PORTS 조회 시도: ${resolvedPort}.${resolvedCommand}.get`);
        const hwPort = (HW_PORTS as any)[resolvedPort]?.[resolvedCommand]?.get;
        logDebug(`[HardwareReadStatus] HW_PORTS 조회 결과:`, hwPort);

        if (!hwPort) {
          logError(`[HardwareReadStatus] 지원하지 않는 포트/명령: ${port}/${command}`);
          logError(`[HardwareReadStatus] 사용 가능한 포트:`, Object.keys(HW_PORTS));
          if ((HW_PORTS as any)[port]) {
            logError(`[HardwareReadStatus] 포트 ${port}의 사용 가능한 명령:`, Object.keys((HW_PORTS as any)[port]));
          }
          return reply
            .code(400)
            .send(createErrorResponse('INVALID_PARAM', `지원하지 않는 포트/명령 조합입니다: ${port}/${command}`));
        }

        logDebug(
          `[HardwareReadStatus] HW_PORTS 정보: FC=${hwPort.functionCode}, Address=${hwPort.address}, Description=${hwPort.description}`,
        );

        // 3. UnifiedModbusCommunicationService를 통한 직접 Modbus 읽기 명령 실행
        const modbusService = serviceContainer.getUnifiedModbusCommunicationService();

        // ModbusCommand 객체 생성 (읽기 명령)
        const modbusCommand = {
          id: `hardware_read_${Date.now()}`,
          type: 'read' as const,
          unitId: '1', // 기본 slaveId
          functionCode: hwPort.functionCode,
          address: hwPort.address,
          lengthOrValue: 1, // 읽기 길이 (1개 레지스터/코일)
          priority: 'normal' as const,
          timestamp: new Date(),
          resolve: () => {},
          reject: () => {},
          ...(hardwareClientId !== undefined ? { clientId: hardwareClientId } : {}),
        };

        const result = await modbusService.executeDirect(modbusCommand);

        if (!result || result.success !== true) {
          logError(`[HardwareReadStatus] Modbus 통신 실패: ${result?.error ?? 'Unknown error'}`);
          return reply
            .code(500)
            .send(createErrorResponse('COMMAND_FAILED', `하드웨어 통신 실패: ${result?.error ?? 'Unknown error'}`));
        }

        logDebug(
          `[HardwareReadStatus] 성공: ${port}/${command}, CommandID=${modbusCommand.id}, Data=${JSON.stringify(
            result.data,
          )}`,
        );

        const values = Array.isArray(result.data) ? result.data : [result.data];
        return reply.code(200).send(
          createSuccessResponse('하드웨어 상태 읽기 성공', {
            commandId: modbusCommand.id,
            values,
          }),
        );
      } catch (error) {
        logError(`[HardwareReadStatus] 예상치 못한 오류 발생:`);
        logError(`[HardwareReadStatus] 오류 타입: ${typeof error}`);
        logError(`[HardwareReadStatus] 오류 메시지: ${error instanceof Error ? error.message : String(error)}`);
        logError(`[HardwareReadStatus] 오류 스택:`, error instanceof Error ? error.stack : 'No stack trace');
        logError(`[HardwareReadStatus] 전체 오류 객체:`, error);

        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              `하드웨어 상태 읽기 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      }
    },
  );

  /**
   * 하드웨어 일괄 제어 (DO 전체 ON/OFF, DI 전체 활성화 등)
   * POST /hardware/bulk-command
   */
  fastify.post<{ Body: HardwareBulkCommandRequest }>(
    '/hardware/bulk-command',
    async (request: FastifyRequest<{ Body: HardwareBulkCommandRequest }>, reply: FastifyReply) => {
      try {
        const { command, value, ports } = request.body;
        logDebug(`[HardwareBulkCommand] 요청: command=${command}, value=${value}`);

        const serviceContainer = ServiceContainer.getInstance();
        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        if (pollingService.isPollingActive()) {
          return reply
            .code(409)
            .send(
              createErrorResponse(
                'COMMAND_FAILED',
                '폴링이 활성화되어 있어 하드웨어 직접 제어가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
              ),
            );
        }

        const unifiedModbus = serviceContainer.getUnifiedModbusService();
        const commandId = `hardware_bulk_${command}_${Date.now()}`;
        const bulk = await executeHardwareBulkCommandWrite(unifiedModbus, command, value, ports);

        logDebug(
          `[HardwareBulkCommand] 완료 portCount=${bulk.portCount} transactions=${bulk.transactionCount} success=${bulk.success}`,
        );

        if (!bulk.success) {
          return reply
            .code(500)
            .send(
              createErrorResponse(
                'COMMAND_FAILED',
                bulk.error ?? `일괄 제어 실패 (${bulk.failedPorts.length}개 포트)`,
              ),
            );
        }

        return reply.code(200).send(
          createSuccessResponse('하드웨어 일괄 제어 성공', {
            commandId,
            command,
            value,
            portCount: bulk.portCount,
            transactionCount: bulk.transactionCount,
          }),
        );
      } catch (error) {
        logError(`[HardwareBulkCommand] 오류: ${error}`);
        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              `하드웨어 일괄 제어 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
      }
    },
  );

  /**
   * 하드웨어 전체 상태 읽기
   * POST /hardware/read-all-status
   */
  fastify.post<{
    Body: HardwareReadAllStatusRequest;
    Reply: HardwareReadAllStatusResponse;
  }>(
    '/hardware/read-all-status',
    async (request: FastifyRequest<{ Body: HardwareReadAllStatusRequest }>, reply: FastifyReply) => {
      try {
        const { commands } = request.body;
        logDebug(`[HardwareReadAllStatus] 요청 파싱 성공: commands=${JSON.stringify(commands)}`);
        logDebug(`[HardwareReadAllStatus] 요청 시작: ${commands.length}개 명령어`);
        logDebug(`[HardwareReadAllStatus] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        logDebug(`[HardwareReadAllStatus] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logDebug(`[HardwareReadAllStatus] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logDebug(`[HardwareReadAllStatus] 폴링 상태: ${isPollingActive}`);

        if (isPollingActive) {
          fastify.log.warn(`[HardwareReadAllStatus] 폴링 활성화 상태로 하드웨어 전체 상태 읽기 거부`);
          return reply.code(409).send({
            success: false,
            error: '폴링이 활성화되어 있어 하드웨어 전체 상태 읽기가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
          });
        }

        // 2. 벌크 읽기 계획 실행
        const modbusReader = createHardwareModbusReader(serviceContainer.getUnifiedModbusService());
        const commandId = `hardware_read_all_${Date.now()}`;

        const { results, transactionCount } = await executeHardwareReadAllStatus(modbusReader, commands);
        logDebug(`[HardwareReadAllStatus] bulk read 완료: transactions=${transactionCount}, commandId=${commandId}`);

        return reply.code(200).send(
          createSuccessResponse('하드웨어 전체 상태 읽기 성공', {
            commandId,
            results,
          }),
        );
      } catch (error) {
        logError(`[HardwareReadAllStatus] 예상치 못한 오류 발생:`);
        logError(`[HardwareReadAllStatus] 오류 타입: ${typeof error}`);
        logError(`[HardwareReadAllStatus] 오류 메시지: ${error instanceof Error ? error.message : String(error)}`);
        logError(`[HardwareReadAllStatus] 오류 스택:`, error instanceof Error ? error.stack : 'No stack trace');
        logError(`[HardwareReadAllStatus] 전체 오류 객체:`, error);

        return reply
          .code(500)
          .send(
            createErrorResponse(
              'INTERNAL_ERROR',
              `하드웨어 전체 상태 읽기 중 오류가 발생했습니다: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
          );
      }
    },
  );
}

export default hardwareRoutes;
