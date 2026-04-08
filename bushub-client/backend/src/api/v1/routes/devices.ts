import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

// API 엔드포인트 상수
const DEVICES_ENDPOINTS = {
  COMMANDS: '/devices/:deviceId/units/:unitId/commands',
  COMMAND_SCHEMA: '/devices/:deviceId/units/:unitId/commands/schema',
  DEVICE_COMMAND_SCHEMA: '/devices/:deviceId/commands/schema',
  DEVICE_COMMANDS_DEVICE_SCHEMA: '/devices/:deviceId/units/:unitId/commands/device-schema',
  ALL_COMMAND_SCHEMA: '/devices/commands/schema',
  DOMAIN_STATUS: '/devices/domain/status',
} as const;

import { commonCommands } from '../../../data/clients';
import { logInfo, logError, logDebug } from '../../../logger';
import { getCommandMapForUnit } from '../../../meta/protocols';
import { CommandLog } from '../../../models/schemas/CommandLogSchema';
import { Device } from '../../../models/schemas/DeviceSchema';
import { Unit } from '../../../models/schemas/UnitSchema';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  handleRouteError,
} from '../../../shared/utils/responseHelper';
import { nowKstFormatted, toApiDateTimeString } from '../../../shared/utils/kstDateTime';
import {
  CommandRequestSchema,
  CommandResponseSchema,
  COMMAND_REQUEST_EXAMPLE,
  COMMAND_RESPONSE_EXAMPLE,
} from '../schemas/command.schema';

// 🆕 unifiedActions에서 디버깅 함수들 import

// Define a type for the multiple commands request body
interface MultiCommandBody {
  commands: {
    action: string;
    value?: number | string;
  }[];
}

// Define a type for the request parameters
interface CommandParams {
  deviceId: string;
  unitId: string;
}

// 디바이스별 명령어 스키마 생성 함수 (오류 처리 강화)
function generateDeviceCommandSchema(deviceType: string) {
  try {
    // commonCommands가 정의되어 있는지 확인
    if (!commonCommands || typeof commonCommands !== 'object') {
      logError(`[generateDeviceCommandSchema] commonCommands가 정의되지 않음: ${typeof commonCommands}`);
      return null;
    }

    const deviceCommands = commonCommands[deviceType as keyof typeof commonCommands];
    if (!deviceCommands) {
      logInfo(`[generateDeviceCommandSchema] 디바이스 타입 '${deviceType}'에 대한 명령어가 없음`);
      return null;
    }

    // deviceCommands가 배열인지 확인
    if (!Array.isArray(deviceCommands)) {
      logError(
        `[generateDeviceCommandSchema] 디바이스 타입 '${deviceType}'의 명령어가 배열이 아님: ${typeof deviceCommands}`,
      );
      return null;
    }

    const commandSchemas = deviceCommands
      .map((command: any) => {
        try {
          return {
            key: command.key,
            label: command.label,
            type: command.type,
            get: command.get,
            set: command.set,
            action: command.action,
            min: command.min,
            max: command.max,
            unit: command.unit,
            options: command.options,
            optionLabels: command.optionLabels,
            defaultValue: command.defaultValue,
            description: `${command.label} ${command.set ? '설정' : '조회'} 명령`,
          };
        } catch (cmdError) {
          logError(
            `[generateDeviceCommandSchema] 명령어 매핑 중 오류: ${cmdError}, command: ${JSON.stringify(command)}`,
          );
          return null;
        }
      })
      .filter(Boolean); // null 값 제거

    return {
      deviceType,
      commands: commandSchemas,
      totalCommands: commandSchemas.length,
      getCommands: commandSchemas.filter((cmd: any) => cmd?.get),
      setCommands: commandSchemas.filter((cmd: any) => cmd?.set),
    };
  } catch (error) {
    logError(`[generateDeviceCommandSchema] 스키마 생성 중 오류: ${error}, deviceType: ${deviceType}`);
    return null;
  }
}

async function deviceRoutes(fastify: FastifyInstance) {
  logDebug('🚀 deviceRoutes 플러그인 시작...');

  // Fastify 데코레이터를 통해 ServiceContainer 접근
  const { serviceContainer } = fastify;

  // Device 도메인 서비스들 가져오기 (오류 처리 강화)
  let deviceServices: any;
  let controlService: any;
  let unifiedModbusPollerService: any;
  let sngilDDCService: any;

  try {
    deviceServices = serviceContainer.getDeviceDomainServices();
    controlService = deviceServices?.controlService;
    unifiedModbusPollerService = deviceServices?.unifiedModbusPollerService;
    sngilDDCService = deviceServices?.sngilDDCService;

    // 서비스 가용성 로깅
    logInfo(
      `[DeviceRoutes] Device 도메인 서비스 초기화 상태: ${JSON.stringify({
        controlService: !!controlService,
        unifiedModbusService: !!controlService?.modbusCommunicationService, // ControlService를 통해 UnifiedModbusService 확인
        modbusPollerService: !!unifiedModbusPollerService,
        sngilDDCService: !!sngilDDCService,
      })}`,
    );
  } catch (error) {
    logError(`[DeviceRoutes] Device 도메인 서비스 초기화 실패: ${error}`);
    // 기본값으로 설정하여 라우터가 작동할 수 있도록 함
    deviceServices = {};
    controlService = null;
    unifiedModbusPollerService = null;
    sngilDDCService = null;
  }
  // GET handler for retrieving command status or available commands for a unit
  fastify.get(
    DEVICES_ENDPOINTS.COMMANDS,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { deviceId, unitId } = request.params as CommandParams;
      const { ids } = request.query as { ids?: string };

      // logInfo(`명령 조회 요청: ${deviceId}/${unitId}${ids ? ` (상태 조회: ${ids})` : ' (사용 가능한 명령 목록)'}`);

      try {
        const unit = await Unit.findOne({ unitId, deviceId }).lean();
        if (!unit) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Unit not found'));
        }

        // ids 쿼리 파라미터가 있으면 명령 상태 조회
        if (ids) {
          const requestIds = ids.split(',').filter(Boolean);
          // logInfo(`🔍 명령 상태 조회 요청: ${deviceId}/${unitId}, requestIds: ${JSON.stringify(requestIds)}`);

          if (requestIds.length === 0) {
            return reply.code(400).send(createErrorResponse(ErrorCodes.BAD_REQUEST, 'No ids provided'));
          }

          // MongoDB에서 해당 조건으로 조회 (ObjectId 변환)
          const objectIds = requestIds
            .map((id) => {
              try {
                return new mongoose.Types.ObjectId(id);
              } catch {
                logError(`❌ ObjectId 변환 실패: ${id}`);
                return null;
              }
            })
            .filter(Boolean);

          // logInfo(`🔍 ObjectId 변환 결과: ${JSON.stringify(objectIds)}`);

          // CommandLog 조회 조건 로깅
          const queryCondition = {
            _id: { $in: objectIds },
            deviceId,
            unitId,
          };
          // logInfo(`🔍 CommandLog 조회 조건: ${JSON.stringify(queryCondition)}`);

          const logs = await CommandLog.find(queryCondition).lean();
          // logInfo(`🔍 CommandLog 조회 결과: ${JSON.stringify(logs)}`);

          // 필요한 필드만 반환 (result 필드 제거 - 중복 정보)
          const result = logs.map((log) => ({
            requestId: log._id.toString(),
            action: log.action,
            status: log.status,
            error: log.error,
            finishedAt: toApiDateTimeString(log.finishedAt),
          }));

          // logInfo(`🔍 최종 응답 데이터: ${JSON.stringify(result)}`);
          reply.send(createSuccessResponse('명령 상태 조회 성공', result));
        } else {
          // ids가 없으면 사용 가능한 명령 목록 반환
          const commandMap = getCommandMapForUnit(unit);
          const availableCommands = Object.keys(commandMap).map((key) => {
            return {
              command: key,
              description: commandMap[key].description,
            };
          });

          reply.code(200).send(createSuccessResponse('사용 가능한 명령 목록 조회 성공', { availableCommands }));
        }
      } catch (error) {
        return handleRouteError(error, reply, 'control', '명령 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // Handler for multiple commands
  fastify.post(
    DEVICES_ENDPOINTS.COMMANDS,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { deviceId, unitId } = request.params as CommandParams;
      // body가 배열이면 그대로, 아니면 commands 필드에서 꺼냄
      const commands = Array.isArray(request.body) ? request.body : (request.body as MultiCommandBody).commands;

      logInfo(`다중 명령 실행 요청: ${deviceId}/${unitId}, 명령 수: ${Array.isArray(commands) ? commands.length : 0}`);

      // 명령 상세 정보 로깅
      if (Array.isArray(commands) && commands.length > 0) {
        const commandDetails = commands.map((cmd) => ({
          action: cmd.action,
          value: cmd.value,
        }));
        logInfo(`명령 상세 정보: ${JSON.stringify(commandDetails, null, 2)}`);
      }

      if (!Array.isArray(commands)) {
        logError(`잘못된 명령 형식: commands must be an array`);
        return reply.code(400).send(createErrorResponse(ErrorCodes.INVALID_PARAM, 'commands must be an array'));
      }

      try {
        const unit = await Unit.findOne({ unitId, deviceId }).lean();
        if (!unit) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Unit not found'));
        }

        // 유닛 타입으로 Modbus 지원 여부 확인
        const supportedTypes = [
          'integrated_sensor',
          'cooler',
          'exchanger',
          'lighting',
          'aircurtain',
          'bench',
          'door',
          'externalsw',
          'people_counter',
        ];
        if (!supportedTypes.includes(unit.type)) {
          return reply
            .code(400)
            .send(
              createErrorResponse(ErrorCodes.INVALID_PARAM, `Commands not applicable to this unit type: ${unit.type}`),
            );
        }

        // 디바이스 정보 조회
        const device = await Device.findOne({ deviceId: unit.deviceId }).lean();
        if (!device) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Device not found'));
        }

        logInfo(`명령 등록 시작: ${deviceId}/${unitId}, 유닛 타입: ${unit.type}`);

        // 각 명령에 대해 CommandLog 생성 (waiting 상태)
        const commandLogs: Array<{
          action: string;
          requestId: string;
          deviceName: string;
          unitName: string;
        }> = [];
        const controlRepository = serviceContainer.getControlRepository();

        for (const cmd of commands) {
          try {
            const commandLog = await controlRepository.createCommandLog({
              deviceId: unit.deviceId,
              unitId: unit.unitId,
              action: cmd.action,
              value: cmd.value,
              status: 'waiting',
            });

            commandLogs.push({
              action: cmd.action,
              requestId: (commandLog._id as any)?.toString() || '',
              deviceName: device.name || unit.deviceId,
              unitName: unit.name || unit.unitId,
            });
          } catch (error) {
            logError(
              `명령 로그 생성 실패: ${cmd.action}, 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            // 개별 명령 실패 시에도 계속 진행
          }
        }

        // 명령을 비동기로 실행 (응답을 기다리지 않음)
        // 기존 CommandLog를 찾아서 실행
        const executeCommandsInBackground = async () => {
          try {
            for (let i = 0; i < commands.length; i++) {
              const cmd = commands[i];
              const commandLog = commandLogs[i];

              if (commandLog && commandLog.requestId) {
                try {
                  // 기존 CommandLog ID로 명령 실행 (중복 생성 방지)
                  await controlService.executeUnitCommandWithExistingLog(
                    unit,
                    device,
                    cmd.action,
                    commandLog.requestId,
                    cmd.value,
                    request,
                  );
                } catch (error) {}
              }
            }
          } catch (error) {
            logError(
              `백그라운드 명령 실행 중 오류 발생: ${deviceId}/${unitId}, 오류: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            );
          }
        };

        // 백그라운드에서 실행 시작
        executeCommandsInBackground();

        logInfo(`명령 등록 완료: ${deviceId}/${unitId}, 등록된 명령 수: ${commandLogs.length}`);
        logInfo(`🔍 CommandLog 생성 결과: ${JSON.stringify(commandLogs)}`);

        reply.code(200).send(createSuccessResponse('유닛 대량제어 명령 등록 성공', commandLogs));
      } catch (error) {
        logError(
          `명령 등록 실패: ${deviceId}/${unitId}, 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        return handleRouteError(error, reply, 'control', '명령 등록 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /devices/:deviceId/units/:unitId/schema (명령 API 스키마)
  fastify.get(
    DEVICES_ENDPOINTS.COMMAND_SCHEMA,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('명령 API 스키마', {
            requestSchema: CommandRequestSchema,
            requestExample: COMMAND_REQUEST_EXAMPLE,
            responseSchema: CommandResponseSchema,
            responseExample: COMMAND_RESPONSE_EXAMPLE,
            description: '장비 제어 명령 API의 요청/응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/devices/{deviceId}/units/{unitId}/command',
                method: 'POST',
                description: '단일 장비 제어 명령 전송',
              },
              {
                path: '/api/v1/external/devices/{deviceId}/units/{unitId}/commands',
                method: 'POST',
                description: '다중 장비 제어 명령 전송',
              },
              {
                path: '/api/v1/external/devices/{deviceId}/units/{unitId}/commands',
                method: 'GET',
                description: '사용 가능한 명령 목록 조회',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'control', '명령 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /devices/:deviceId/units/:unitId/commands/device-schema (디바이스별 명령어 스키마)
  fastify.get(
    DEVICES_ENDPOINTS.DEVICE_COMMANDS_DEVICE_SCHEMA,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { deviceId, unitId } = request.params as CommandParams;

      logInfo(`디바이스 명령어 스키마 조회 요청: ${deviceId}/${unitId}`);

      try {
        // 유닛 존재 확인
        const unit = await Unit.findOne({ unitId }).lean();
        if (!unit) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Unit not found'));
        }

        // 디바이스 정보 조회
        const device = await Device.findOne({ deviceId }).lean();
        if (!device) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Device not found'));
        }

        // 디바이스별 명령어 스키마 생성
        const deviceCommandSchema = generateDeviceCommandSchema(device.type);

        if (!deviceCommandSchema) {
          return reply.code(404).send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, 'Device type not supported'));
        }

        reply.send(
          createSuccessResponse('디바이스 명령어 스키마 조회 성공', {
            deviceId,
            unitId,
            deviceType: device.type,
            deviceName: device.name,
            schema: deviceCommandSchema,
            description: `${device.name} (${device.type}) 디바이스의 사용 가능한 명령어 스키마입니다.`,
          }),
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logError(`Error retrieving device command schema for ${deviceId}/${unitId}`);
        reply
          .code(500)
          .send(
            createErrorResponse(ErrorCodes.INTERNAL_ERROR, `Failed to retrieve device command schema: ${errorMessage}`),
          );
      }
    },
  );

  // GET /devices/commands/schema (모든 디바이스 타입의 명령어 스키마)
  fastify.get(
    DEVICES_ENDPOINTS.ALL_COMMAND_SCHEMA,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      logInfo('모든 디바이스 타입의 명령어 스키마 조회 요청');

      try {
        // 모든 디바이스 타입의 명령어 스키마 생성
        const allDeviceSchemas: any = {};

        Object.keys(commonCommands).forEach((deviceType) => {
          const deviceCommandSchema = generateDeviceCommandSchema(deviceType);
          if (deviceCommandSchema) {
            allDeviceSchemas[deviceType] = deviceCommandSchema;
          }
        });

        // Device 도메인 서비스 상태 정보 추가
        const deviceDomainStatus = {
          controlService: !!controlService,
          unifiedModbusService: !!controlService?.modbusCommunicationService, // ControlService를 통해 UnifiedModbusService 확인
          modbusPollerService: !!unifiedModbusPollerService,
          sngilDDCService: !!sngilDDCService,
          pollingStatus: unifiedModbusPollerService?.isPollingActive() || false,
        };

        reply.send(
          createSuccessResponse('모든 디바이스 타입의 명령어 스키마 조회 성공', {
            totalDeviceTypes: Object.keys(allDeviceSchemas).length,
            deviceTypes: Object.keys(allDeviceSchemas),
            schemas: allDeviceSchemas,
            deviceDomainStatus,
            description: '모든 디바이스 타입의 사용 가능한 명령어 스키마입니다.',
            usage: {
              apiSchema: '/api/v1/external/devices/{deviceId}/units/{unitId}/commands/schema',
              deviceSchema: '/api/v1/external/devices/{deviceId}/units/{unitId}/commands/device-schema',
              all: '/api/v1/external/devices/commands/schema',
            },
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'devices', '디바이스 명령어 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /devices/:deviceId/commands/schema (특정 디바이스의 명령어 스키마)
  fastify.get(
    DEVICES_ENDPOINTS.DEVICE_COMMAND_SCHEMA,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { deviceId } = request.params as { deviceId: string };

      logInfo(`특정 디바이스 명령어 스키마 조회 요청: ${deviceId}`);

      try {
        // deviceId가 비어있는 경우
        if (!deviceId || deviceId.trim() === '') {
          return reply.code(400).send(createErrorResponse(ErrorCodes.BAD_REQUEST, 'Device ID is required'));
        }

        // 디바이스 정보 조회
        const device = await Device.findOne({ deviceId }).lean();

        // 해당하는 장비가 없는 경우
        if (!device) {
          return reply
            .code(404)
            .send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, `Device with ID '${deviceId}' not found`));
        }

        // 디바이스별 명령어 스키마 생성
        const deviceCommandSchema = generateDeviceCommandSchema(device.type);

        if (!deviceCommandSchema) {
          return reply
            .code(404)
            .send(createErrorResponse(ErrorCodes.UNIT_NOT_FOUND, `Device type '${device.type}' not supported`));
        }

        reply.send(
          createSuccessResponse('디바이스 명령어 스키마 조회 성공', {
            deviceId,
            deviceType: device.type,
            deviceName: device.name,
            schema: deviceCommandSchema,
            description: `${device.name} (${device.type}) 디바이스의 사용 가능한 명령어 스키마입니다.`,
            usage: {
              apiSchema: `/api/v1/external/devices/${deviceId}/units/{unitId}/commands/schema`,
              deviceSchema: `/api/v1/external/devices/${deviceId}/units/{unitId}/commands/device-schema`,
              device: `/api/v1/external/devices/${deviceId}/commands/schema`,
              all: '/api/v1/external/devices/commands/schema',
            },
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'devices', '디바이스 명령어 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /devices/domain/status (Device 도메인 서비스 상태 조회)
  fastify.get(
    DEVICES_ENDPOINTS.DOMAIN_STATUS,
    { preHandler: [fastify.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      logInfo('Device 도메인 서비스 상태 조회 요청');

      try {
        const deviceDomainStatus = {
          controlService: {
            available: !!controlService,
            status: 'active',
          },
          unifiedModbusService: {
            available: !!controlService?.modbusCommunicationService, // ControlService를 통해 UnifiedModbusService 확인
            status: 'active',
          },
          modbusPollerService: {
            available: !!unifiedModbusPollerService,
            isPolling: unifiedModbusPollerService?.isPollingActive() || false,
            status: unifiedModbusPollerService?.getPollingStats() || 'unknown',
          },
          sngilDDCService: {
            available: !!sngilDDCService,
            status: 'active',
          },
          timestamp: nowKstFormatted(),
        };

        reply.send(
          createSuccessResponse('Device 도메인 서비스 상태 조회 성공', {
            domain: 'Device',
            services: deviceDomainStatus,
            description: 'Device 도메인의 모든 서비스 상태 정보입니다.',
            usage: '/api/v1/external/devices/domain/status',
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'devices', 'Device 도메인 서비스 상태 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(deviceRoutes);
