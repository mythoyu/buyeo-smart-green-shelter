import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { HW_PORTS } from '../../../meta/hardware/ports';
import { createSuccessResponse, createErrorResponse } from '../../../shared/utils/responseHelper';
import { logError, logInfo } from '../../../logger';

// 하드웨어 직접 제어 요청 타입
interface HardwareDirectCommandRequest {
  port: string;
  command: string;
  value: boolean | number;
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
      const body = (request.body as any) || {};
      const action = String(body.action || '').toLowerCase();

      const serviceContainer = ServiceContainer.getInstance();
      const modbusService = serviceContainer.getUnifiedModbusCommunicationService();

      // 유틸: 단일 명령 읽기
      const readCmd = async (port: string, command: string) => {
        const hw = (HW_PORTS as any)[port]?.[command]?.get;
        if (!hw) return null;
        const result = await modbusService.executeDirect({
          id: `system_read_${port}_${command}_${Date.now()}`,
          type: 'read',
          unitId: '1',
          functionCode: hw.functionCode,
          address: hw.address,
          lengthOrValue: 1,
          priority: 'normal',
          timestamp: new Date(),
          resolve: () => {},
          reject: () => {},
        } as any);
        return result?.success ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;
      };

      // 유틸: 단일 명령 쓰기
      const writeCmd = async (port: string, command: string, value: number | boolean) => {
        const hw = (HW_PORTS as any)[port]?.[command]?.set;
        if (!hw) return false;
        const numeric = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
        const result = await modbusService.executeDirect({
          id: `system_write_${port}_${command}_${Date.now()}`,
          type: 'write',
          unitId: '1',
          functionCode: hw.functionCode,
          address: hw.address,
          lengthOrValue: numeric,
          priority: 'high',
          timestamp: new Date(),
          resolve: () => {},
          reject: () => {},
        } as any);
        return !!result?.success;
      };

      if (action === 'read') {
        // SEASON + MONTHLY_SUMMER_*
        const seasonVal = await readCmd('SEASONAL', 'SEASON');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthly: Record<string, boolean> = {};
        for (const m of months) {
          const v = await readCmd('SEASONAL', `MONTHLY_SUMMER` as any)?.catch?.(() => null);
          // 상세 월별 키가 SEASONAL.MONTHLY_SUMMER[MON].get 형태인 경우 보완
          const hw = (HW_PORTS as any)['SEASONAL']?.['MONTHLY_SUMMER']?.[m]?.get;
          let mv: any = null;
          if (hw) {
            const r = await modbusService.executeDirect({
              id: `system_read_SEASONAL_MONTHLY_${m}_${Date.now()}`,
              type: 'read',
              unitId: '1',
              functionCode: hw.functionCode,
              address: hw.address,
              lengthOrValue: 1,
              priority: 'normal',
              timestamp: new Date(),
              resolve: () => {},
              reject: () => {},
            } as any);
            mv = r?.success ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;
          }
          monthly[m] = mv === 1;
        }
        return reply.code(200).send(
          createSuccessResponse('절기 설정 조회 성공', {
            season: seasonVal === 1,
            monthlySummer: monthly,
          }),
        );
      }

      if (action === 'set') {
        const season: boolean | undefined = typeof body.season === 'boolean' ? body.season : undefined;
        const monthly = (body.monthlySummer || {}) as Record<string, boolean>;

        // season 쓰기
        if (typeof season === 'boolean') {
          const ok = await writeCmd('SEASONAL', 'SEASON', season);
          if (!ok) return reply.code(500).send(createErrorResponse('COMMAND_FAILED', 'SEASON 설정 실패'));
        }
        // 월별 쓰기
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        for (const m of months) {
          if (m in monthly) {
            const hw = (HW_PORTS as any)['SEASONAL']?.['MONTHLY_SUMMER']?.[m]?.set;
            if (hw) {
              const numeric = monthly[m] ? 1 : 0;
              const r = await modbusService.executeDirect({
                id: `system_write_SEASONAL_MONTHLY_${m}_${Date.now()}`,
                type: 'write',
                unitId: '1',
                functionCode: hw.functionCode,
                address: hw.address,
                lengthOrValue: numeric,
                priority: 'high',
                timestamp: new Date(),
                resolve: () => {},
                reject: () => {},
              } as any);
              if (!r?.success) return reply.code(500).send(createErrorResponse('COMMAND_FAILED', `${m} 설정 실패`));
            }
          }
        }
        return reply.code(200).send(createSuccessResponse('절기 설정 적용 성공'));
      }

      return reply.code(400).send(createErrorResponse('INVALID_PARAM', 'action은 read 또는 set 이어야 합니다.'));
    } catch (error) {
      return reply
        .code(500)
        .send(
          createErrorResponse(
            'INTERNAL_ERROR',
            `절기 설정 처리 중 오류: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  });

  // ==================== 새 단순 엔드포인트: 시스템/DDC 시간 ====================
  fastify.post('/hardware/system/ddc-time', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body as any) || {};
      const action = String(body.action || '').toLowerCase();

      // 현재 매핑 부재 시 안전 응답
      // 추후 HW_PORTS에 DDC_TIME 매핑이 추가되면 동일 패턴으로 read/set 구현
      return reply
        .code(501)
        .send(createErrorResponse('COMMAND_FAILED', 'DDC 시간 전용 매핑이 준비되지 않았습니다. 추후 지원 예정'));
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
        logInfo(`[HardwareDirectCommand] 요청 파싱 성공: port=${port}, command=${command}, value=${value}`);
        logInfo(`[HardwareDirectCommand] 요청 시작: ${port}/${command} = ${value}`);
        logInfo(`[HardwareDirectCommand] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        logInfo(`[HardwareDirectCommand] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logInfo(`[HardwareDirectCommand] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logInfo(`[HardwareDirectCommand] 폴링 상태: ${isPollingActive}`);

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
        logInfo(`[HardwareDirectCommand] HW_PORTS 조회 시도: ${port}.${command}.set`);
        const hwPort = (HW_PORTS as any)[port]?.[command]?.set;
        logInfo(`[HardwareDirectCommand] HW_PORTS 조회 결과:`, hwPort);

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

        logInfo(
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
        };

        const result = await modbusService.executeDirect(modbusCommand);

        if (!result || result.success !== true) {
          logError(`[HardwareDirectCommand] Modbus 통신 실패: ${result?.error ?? 'Unknown error'}`);
          return reply
            .code(500)
            .send(createErrorResponse('COMMAND_FAILED', `하드웨어 통신 실패: ${result?.error ?? 'Unknown error'}`));
        }

        logInfo(`[HardwareDirectCommand] 성공: ${port}/${command} = ${value}, CommandID=${modbusCommand.id}`);

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
        logInfo(`[HardwareReadStatus] 요청 파싱 성공: port=${port}, command=${command}`);
        logInfo(`[HardwareReadStatus] 요청 시작: ${port}/${command}`);
        logInfo(`[HardwareReadStatus] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        logInfo(`[HardwareReadStatus] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logInfo(`[HardwareReadStatus] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logInfo(`[HardwareReadStatus] 폴링 상태: ${isPollingActive}`);

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
        logInfo(`[HardwareReadStatus] HW_PORTS 조회 시도: ${resolvedPort}.${resolvedCommand}.get`);
        const hwPort = (HW_PORTS as any)[resolvedPort]?.[resolvedCommand]?.get;
        logInfo(`[HardwareReadStatus] HW_PORTS 조회 결과:`, hwPort);

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

        logInfo(
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
        };

        const result = await modbusService.executeDirect(modbusCommand);

        if (!result || result.success !== true) {
          logError(`[HardwareReadStatus] Modbus 통신 실패: ${result?.error ?? 'Unknown error'}`);
          return reply
            .code(500)
            .send(createErrorResponse('COMMAND_FAILED', `하드웨어 통신 실패: ${result?.error ?? 'Unknown error'}`));
        }

        logInfo(
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
        logInfo(`[HardwareReadAllStatus] 요청 파싱 성공: commands=${JSON.stringify(commands)}`);
        logInfo(`[HardwareReadAllStatus] 요청 시작: ${commands.length}개 명령어`);
        logInfo(`[HardwareReadAllStatus] 요청 body:`, request.body);

        // 1. 폴링 상태 확인 (중지 시에만 허용)
        const serviceContainer = ServiceContainer.getInstance();
        logInfo(`[HardwareReadAllStatus] ServiceContainer 인스턴스 획득 성공`);

        const pollingService = serviceContainer.getUnifiedModbusPollerService();
        logInfo(`[HardwareReadAllStatus] PollingService 획득 성공`);

        const isPollingActive = pollingService.isPollingActive();
        logInfo(`[HardwareReadAllStatus] 폴링 상태: ${isPollingActive}`);

        if (isPollingActive) {
          fastify.log.warn(`[HardwareReadAllStatus] 폴링 활성화 상태로 하드웨어 전체 상태 읽기 거부`);
          return reply.code(409).send({
            success: false,
            error: '폴링이 활성화되어 있어 하드웨어 전체 상태 읽기가 불가능합니다. 폴링을 중지한 후 다시 시도해주세요.',
          });
        }

        // 2. 명령어에 따라 적절한 포트와 명령어 조합으로 읽기 실행
        const modbusService = serviceContainer.getUnifiedModbusCommunicationService();
        const results: { [port: string]: { [command: string]: number[] } } = {};
        const commandId = `hardware_read_all_${Date.now()}`;

        // 포트 목록 정의
        const doPorts = [
          'DO1',
          'DO2',
          'DO3',
          'DO4',
          'DO5',
          'DO6',
          'DO7',
          'DO8',
          'DO9',
          'DO10',
          'DO11',
          'DO12',
          'DO13',
          'DO14',
          'DO15',
          'DO16',
        ];

        const diPorts = [
          'DI1',
          'DI2',
          'DI3',
          'DI4',
          'DI5',
          'DI6',
          'DI7',
          'DI8',
          'DI9',
          'DI10',
          'DI11',
          'DI12',
          'DI13',
          'DI14',
          'DI15',
          'DI16',
        ];

        const hvacPorts = ['COOLER', 'EXCHANGER'];

        // 명령어에 따라 처리할 포트 결정
        let targetPorts: string[] = [];
        if (commands.includes('ENABLE') || commands.includes('DI_STATUS')) {
          // DI 관련 명령어가 있으면 DI 포트 처리
          targetPorts = diPorts;
        } else if (
          commands.includes('MODE') ||
          commands.includes('SPEED') ||
          commands.includes('SUMMER_CONT_TEMP') ||
          commands.includes('WINTER_CONT_TEMP') ||
          commands.includes('CUR_TEMP')
        ) {
          // HVAC 관련 명령어가 있으면 HVAC 포트 처리
          targetPorts = hvacPorts;
        } else {
          // 기본적으로 DO 포트 처리
          targetPorts = doPorts;
        }

        logInfo(`[HardwareReadAllStatus] 전체 읽기 시작: ${targetPorts.length}개 포트 × ${commands.length}개 명령어`);

        for (const port of targetPorts) {
          results[port] = {};

          for (const command of commands) {
            try {
              let hwPort;

              // DI_STATUS 명령어는 특별 처리
              if (command === 'DI_STATUS') {
                hwPort = (HW_PORTS as any)['DI_STATUS']?.[port]?.get;
              } else {
                hwPort = (HW_PORTS as any)[port]?.[command]?.get;
              }

              if (!hwPort) {
                fastify.log.warn(`[HardwareReadAllStatus] 지원하지 않는 포트/명령: ${port}/${command}`);
                results[port][command] = [];
                continue;
              }

              // Modbus 읽기 명령 생성
              const modbusCommand = {
                id: `${commandId}_${port}_${command}`,
                type: 'read' as const,
                unitId: '1',
                functionCode: hwPort.functionCode,
                address: hwPort.address,
                lengthOrValue: hwPort.length || 1, // 하드웨어 설정의 length 사용, 없으면 1
                priority: 'normal' as const,
                timestamp: new Date(),
                resolve: () => {},
                reject: () => {},
              };

              // 읽기 실행
              const result = await modbusService.executeDirect(modbusCommand);

              if (result.success) {
                results[port][command] = result.data || [];
                logInfo(`[HardwareReadAllStatus] 성공: ${port}/${command} = ${JSON.stringify(result.data)}`);
              } else {
                logError(`[HardwareReadAllStatus] 실패: ${port}/${command} - ${result.error}`);
                results[port][command] = [];
              }

              // 각 읽기 사이에 작은 지연 (하드웨어 부하 방지)
              // await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (error) {
              logError(`[HardwareReadAllStatus] 오류: ${port}/${command} - ${error}`);
              results[port][command] = [];
            }
          }
        }

        logInfo(`[HardwareReadAllStatus] 전체 읽기 완료: CommandID=${commandId}`);

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
