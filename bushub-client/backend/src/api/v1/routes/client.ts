import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// API 엔드포인트 상수
const CLIENT_ENDPOINTS = {
  CLIENT: '/client',
  SCHEMA: '/client/schema',
} as const;

import { ServiceContainer } from '../../../core/container/ServiceContainer';
import { getKstNowParts } from '../../../utils/time';
import { clients, clientUnits } from '../../../data/clients';
import { deviceMappingHelpers } from '../../../data/mappings/deviceMapping';
import { logInfo, logError, logDebug, logWarn } from '../../../logger';
import { Client as ClientSchema } from '../../../models/schemas/ClientSchema';
import { Data as DataSchema } from '../../../models/schemas/DataSchema';
import { Device as DeviceSchema } from '../../../models/schemas/DeviceSchema';
import { Error as ErrorSchema } from '../../../models/schemas/ErrorSchema';
import { Status as StatusSchema } from '../../../models/schemas/StatusSchema';
import { Unit as UnitSchema } from '../../../models/schemas/UnitSchema';
import { toApiDateTimeStringOrNow } from '../../../shared/utils/kstDateTime';
import {
  createSuccessResponse,
  ErrorMessages,
  HttpValidationError,
  handleHttpSuccess,
  handleRouteError,
} from '../../../shared/utils/responseHelper';
import { ClientResponseSchema, CLIENT_RESPONSE_EXAMPLE } from '../schemas/client.schema';
import { getDeviceDefaultValues, getFallbackDeviceValues } from '../../../data/clientDefaultDataMapping';

// 유닛별 실제 운용 데이터 생성 함수
function generateRealOperationData(clientId: string, deviceType: string, unitId: string): any {
  try {
    // 클라이언트별 유닛 기본값 조회
    const unitDefaults = getDeviceDefaultValues(clientId, deviceType as any, unitId);

    if (unitDefaults) {
      logInfo(`✅ ${clientId}의 ${deviceType} 유닛 ${unitId} 기본값 사용:`, unitDefaults);
      return unitDefaults;
    }

    // 유닛별 기본값이 없는 경우 fallback 값 사용
    logInfo(`⚠️ ${clientId}의 ${deviceType} 유닛 ${unitId} 기본값이 없습니다. fallback 값 사용`);
    return getFallbackDeviceValues(deviceType as any);
  } catch (error) {
    logError(`❌ ${deviceType} 유닛 ${unitId} 기본값 조회 실패:`, error);
    return getFallbackDeviceValues(deviceType as any);
  }
}

// 요청 검증 및 파싱 함수
function validateAndParseRequest(request: FastifyRequest) {
  let body = (request.body as any) || {};

  // 만약 body가 문자열이면 JSON 파싱
  if (typeof request.body === 'string') {
    try {
      body = JSON.parse(request.body);
    } catch (e) {
      logError(`JSON 파싱 실패: ${e}`);
      throw new HttpValidationError(ErrorMessages.TEST_CLIENT_REQUIRED_ID);
    }
  }

  const { id: clientId, initialize = false } = body;

  if (!clientId) {
    logInfo('External 클라이언트 요청: id가 제공되지 않았습니다.');
    throw new HttpValidationError(ErrorMessages.TEST_CLIENT_REQUIRED_ID);
  }

  logInfo(`클라이언트 요청: ${clientId}, initialize: ${initialize}`);
  return { clientId, initialize };
}

/** c0103 등 정의상 people_counter가 있으나 DB에 d082가 없으면 생성 */
async function ensurePeopleCounterIfNeeded(clientId: string): Promise<void> {
  const info = clientUnits[clientId as keyof typeof clientUnits];
  if (!info || !('people_counter' in info)) return;

  const exists = await DeviceSchema.exists({ clientId, deviceId: 'd082' });
  if (exists) return;

  logInfo(`[동기화] ${clientId}에 피플카운터(d082) 누락 → DB 생성`);

  const units = (info as any).people_counter as { id: string; name: string }[];
  const deviceName = '피플카운터';

  await DeviceSchema.create({
    deviceId: 'd082',
    clientId,
    name: deviceName,
    type: 'people_counter',
  });
  await StatusSchema.create({
    deviceId: 'd082',
    clientId,
    status: 0,
    lastUpdated: new Date(),
  });
  await DataSchema.create({
    clientId,
    deviceId: 'd082',
    type: 'people_counter',
    units: Object.fromEntries(
      units.map((u) => [
        u.id,
        {
          unitId: u.id,
          data: generateRealOperationData(clientId, 'people_counter', u.id),
        },
      ]),
    ),
    updatedAt: new Date(),
  });
  await ErrorSchema.create({
    deviceId: 'd082',
    clientId,
    units: [],
    updatedAt: new Date(),
  });
  for (const u of units) {
    await UnitSchema.create({
      unitId: u.id,
      deviceId: 'd082',
      clientId,
      name: u.name,
      status: 0,
      type: 'people_counter',
      data: {},
    });
  }
  logInfo(`[동기화] 피플카운터(d082) 생성 완료`);
}

// 기존 클라이언트 처리 함수
async function handleExistingClient(existingClient: any, reply: FastifyReply) {
  logInfo(`기존 클라이언트 설정 유지: ${existingClient.id}`);

  await ensurePeopleCounterIfNeeded(existingClient.id);

  // 기존 장비 정보 조회하여 응답
  const savedDevices = await DeviceSchema.find({ clientId: existingClient.id }).lean();
  const devicesWithUnits = await Promise.all(
    savedDevices.map(async (device) => {
      const units = await UnitSchema.find({ deviceId: device.deviceId, clientId: existingClient.id }).lean();
      return { ...device, units };
    }),
  );

  const devicesForApi = devicesWithUnits.map((device) => ({
    id: device.deviceId,
    name: device.name,
    type: device.type,
    units: device.units.map((unit: any) => ({
      id: unit.unitId,
      name: unit.name,
    })),
  }));

  const result = {
    id: existingClient.id,
    name: existingClient.name,
    location: existingClient.location,
    type: existingClient.type,
    region: existingClient.region,
    city: existingClient.city,
    latitude: existingClient.latitude,
    longitude: existingClient.longitude,
    devices: devicesForApi,
    updatedAt: toApiDateTimeStringOrNow(existingClient.updatedAt),
  };

  return handleHttpSuccess(
    ErrorMessages.TEST_CLIENT_SELECT_SUCCESS,
    {
      client: result,
      message: '기존 클라이언트 설정이 유지되었습니다.',
    },
    reply,
  );
}

// DDC 설정 초기화 함수
async function initializeDdcSettings(clientId: string) {
  logInfo(`DDC 설정 초기화 시작: ${clientId}`);

  try {
    const serviceContainer = ServiceContainer.getInstance();
    const systemService = serviceContainer.getSystemService();

    // 현재 시간(KST) 기반 DDC 시간 초기값
    const now = getKstNowParts();
    const ddcTimeData = {
      year: now.year,
      month: now.month,
      day: now.day,
      dow: now.dow, // 0=일요일, 6=토요일
      hour: now.hour,
      minute: now.minute,
      second: now.second,
    };

    // 기본 절기 설정 (6-8월만 여름, 나머지는 겨울)
    const seasonalData = {
      season: 0, // 현재 계절: 겨울
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 1,
      july: 1,
      august: 1,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
    };

    // SystemService를 통해 설정 저장
    await systemService.updateSettings({
      ddcTime: ddcTimeData,
      seasonal: seasonalData,
    });

    logInfo(`DDC 설정 초기화 완료: ${clientId}`);
    return true;
  } catch (error) {
    logInfo(`DDC 설정 초기화 실패: ${clientId}, 에러: ${error}`);
    return false;
  }
}

// 시스템 설정 초기화 함수 (기본값으로 초기화)
async function initializeSystemSettings(clientId: string) {
  logInfo(`시스템 설정 초기화 시작: ${clientId}`);

  try {
    const serviceContainer = ServiceContainer.getInstance();
    const systemService = serviceContainer.getSystemService();

    // 1️⃣ System 컬렉션에 기본 설정 저장
    // 네트워크 관련 기능은 Network Control API로 이관되어 더 이상 사용하지 않음
    const { System } = await import('../../../models/schemas/SystemSchema');
    const defaultSettings = (System as any).getDefaultSettings();

    const systemSettings: any = {
      ...defaultSettings, // 모든 기본값 사용 (runtime, seasonal, device-advanced 포함)
    };

    // 네트워크/NTP/SoftAP 설정은 Network Control API에서 별도 관리
    // 여기서는 기본값만 사용

    // SystemService를 통해 설정 저장
    await systemService.updateSettings(systemSettings);

    logInfo(`시스템 설정 초기화 완료: ${clientId}`);
    return true;
  } catch (error) {
    logInfo(`시스템 설정 초기화 실패: ${clientId}, 에러: ${error}`);
    return false;
  }
}

// 데이터베이스 재설정 함수
async function resetDatabase(clientId: string, includeHardware: boolean) {
  logInfo(`데이터 삭제 시작: ${clientId}`);

  // 기존 클라이언트 데이터 삭제 (단일 문서 컬렉션은 전체 삭제, 다중 문서 컬렉션은 클라이언트별 삭제)
  const clientDeleteResult = await ClientSchema.deleteMany({}); // 항상 1개만 유지
  const statusDeleteResult = await StatusSchema.deleteMany({}); // 항상 1개만 유지

  if (includeHardware) {
    const dataDeleteResult = await DataSchema.deleteMany({}); // 항상 1개만 유지
  }

  const errorDeleteResult = await ErrorSchema.deleteMany({}); // 항상 1개만 유지
  const deviceDeleteResult = await DeviceSchema.deleteMany({}); // 전체 삭제
  const unitDeleteResult = await UnitSchema.deleteMany({}); // 전체 삭제

  logInfo(`기존 클라이언트 데이터 삭제 완료 (${includeHardware ? '하드웨어 초기화 포함' : '소프트웨어만'})`);
}

// 클라이언트 생성 함수
async function createClient(clientId: string) {
  logInfo(`클라이언트 재설정 및 하드웨어 초기화: ${clientId}`);

  // 클라이언트 정보를 하드코딩된 기본값으로 생성
  const selectedClient = clients.find((c) => c.id === clientId);

  if (!selectedClient) {
    logInfo(`클라이언트 ID ${clientId}를 찾을 수 없습니다.`);
    throw new HttpValidationError(ErrorMessages.TEST_CLIENT_NOT_FOUND);
  }

  logInfo(`클라이언트 ID ${clientId}`);

  // 새로운 클라이언트 정보 저장
  const clientInfo = {
    id: selectedClient.id,
    name: selectedClient.name,
    location: selectedClient.location,
    type: selectedClient.type,
    region: selectedClient.region,
    city: selectedClient.city,
    latitude: selectedClient.latitude,
    longitude: selectedClient.longitude,
    status: 'active', // 활성 상태
  };
  logInfo(`클라이언트 정보 생성 완료`);

  const savedClient = await ClientSchema.create(clientInfo);
  logInfo(`클라이언트 정보 저장 완료`);

  return savedClient;
}

// 장비/유닛 생성 함수
async function createDevicesAndUnits(savedClient: any, clientUnitInfo: any, initialize: boolean) {
  // clientUnits에서 해당 클라이언트의 장비/유닛 정보 자동 생성
  logInfo(`클라이언트 유닛 정보 조회 완료`);

  if (!clientUnitInfo) {
    logInfo(`클라이언트 ${savedClient.id}의 유닛 정보를 찾을 수 없습니다.`);
    throw new HttpValidationError(ErrorMessages.TEST_CLIENT_NOT_FOUND);
  }

  // 자동 장비 생성
  logInfo(`자동 장비 생성 시작: ${Object.keys(clientUnitInfo).length}개 장비 타입`);

  // 각 장비 타입별로 DeviceSchema와 UnitSchema 자동 생성
  for (const [deviceType, units] of Object.entries(clientUnitInfo)) {
    try {
      logInfo(`장비 타입 ${deviceType} 처리 시작`);

      // deviceType으로 deviceId 찾기
      let deviceId: string | undefined;
      try {
        deviceId = deviceMappingHelpers.getDeviceIdByType(deviceType);
        logInfo(`장비 타입 ${deviceType} -> deviceId: ${deviceId}`);
      } catch (error) {
        logInfo(`장비 타입 ${deviceType}에서 deviceId 조회 중 에러: ${error}`);
        continue;
      }

      if (!deviceId) {
        logInfo(`장비 타입 ${deviceType}에 대한 deviceId를 찾을 수 없습니다.`);
        continue;
      }

      // 장비 이름 자동 생성
      const deviceNames: Record<string, string> = {
        lighting: '조명',
        cooler: '냉난방기',
        exchanger: '전열교환기',
        aircurtain: '에어커튼',
        bench: '온열벤치',
        door: '자동문',
        integrated_sensor: '통합센서',
        externalsw: '자동문외부스위치',
        people_counter: '피플카운터',
      };

      const deviceName = deviceNames[deviceType as keyof typeof deviceNames] || deviceType;

      // DeviceSchema에 저장
      const createdDevice = await DeviceSchema.create({
        deviceId,
        clientId: savedClient.id,
        name: deviceName,
        type: deviceType,
      });

      // 해당 Device의 Status 생성
      await StatusSchema.create({
        deviceId: createdDevice.deviceId,
        clientId: savedClient.id,
        status: 0, // normal
        lastUpdated: new Date(),
      });

      // 해당 Device의 Data 생성 (initialize가 true일 때만)
      if (initialize) {
        await DataSchema.create({
          clientId: savedClient.id,
          deviceId: createdDevice.deviceId,
          type: deviceType,
          units: (units as any[]).map((unit: any) => ({
            unitId: unit.id,
            data: generateRealOperationData(savedClient.id, deviceType, unit.id),
          })),
          updatedAt: new Date(),
        });
      }

      // 해당 Device의 Error 생성
      await ErrorSchema.create({
        deviceId: createdDevice.deviceId,
        clientId: savedClient.id,
        units: [], // 빈 에러 배열
        updatedAt: new Date(),
      });

      // 해당 장비 타입의 모든 유닛을 UnitSchema에 저장
      for (const unit of units as any[]) {
        const createdUnit = await UnitSchema.create({
          unitId: unit.id,
          deviceId,
          clientId: savedClient.id,
          name: unit.name,
          status: 0, // 0: normal
          type: deviceType,
          data: {},
        });
      }

      logInfo(`장비 자동 생성 완료: ${deviceId} (${deviceName}) - ${(units as any[]).length}개 유닛`);
    } catch (error) {
      logInfo(`장비 타입 ${deviceType} 처리 중 에러 발생: ${error}`);
      continue;
    }
  }
}

// 하드웨어 초기화 함수
async function initializeHardware(clientId: string) {
  logInfo(`하드웨어 초기화 시작: ${clientId}`);
  try {
    // 1️⃣ DDC 설정 초기화 (항상 실행)
    const ddcInitSuccess = await initializeDdcSettings(clientId);
    if (!ddcInitSuccess) {
      logInfo(`DDC 설정 초기화 실패했지만 계속 진행: ${clientId}`);
    }

    // 2️⃣ 시스템 설정 초기화
    const systemInitSuccess = await initializeSystemSettings(clientId);
    if (!systemInitSuccess) {
      logInfo(`시스템 설정 초기화 실패했지만 계속 진행: ${clientId}`);
    }

    // 3️⃣ 하드웨어 초기화 (DataApplyService 사용)
    const serviceContainer = ServiceContainer.getInstance();
    const dataApplyService = serviceContainer.getDataApplyService();

    // 하드웨어 초기화 실행
    const hardwareInitResult = await dataApplyService.applyData('system-init');
    logInfo(`하드웨어 초기화 완료: ${clientId} - ${hardwareInitResult.appliedDevices}개 장비 성공`);

    // 4️⃣ DDC 시간 동기화
    const ddcTimeSyncService = serviceContainer.getDdcTimeSyncService();
    await (ddcTimeSyncService as any).syncTime(clientId);
    logInfo(`DDC 시간 동기화 완료: ${clientId}`);

    // 5️⃣ 통합 폴링 시작
    const modbusPollerService = serviceContainer.getUnifiedModbusPollerService();
    await (modbusPollerService as any).startPolling();
    logInfo(`통합 폴링 시작 완료: ${clientId}`);

    logInfo(`하드웨어 초기화 완료: ${clientId}`);
  } catch (error) {
    logError(`하드웨어 초기화 실패: ${clientId} - ${error}`);
    // 하드웨어 초기화 실패해도 클라이언트 생성은 계속 진행
  }
}

// 응답 생성 함수
async function buildClientResponse(savedClient: any, initialize: boolean) {
  // 생성 완료 후 데이터베이스 상태 확인
  const allClients = await ClientSchema.find({});
  const allDevices = await DeviceSchema.find({});
  const allUnits = await UnitSchema.find({});

  logInfo(`전체 Client 수: ${allClients.length}`);
  logInfo(`전체 Device 수: ${allDevices.length}`);
  logInfo(`전체 Unit 수: ${allUnits.length}`);

  // 응답용 장비 정보 조회
  const savedDevices = await DeviceSchema.find({ clientId: savedClient.id }).lean();
  const devicesWithUnits = await Promise.all(
    savedDevices.map(async (device) => {
      const units = await UnitSchema.find({ deviceId: device.deviceId, clientId: savedClient.id }).lean();
      return { ...device, units };
    }),
  );

  const devicesForApi = devicesWithUnits.map((device) => ({
    id: device.deviceId,
    name: device.name,
    type: device.type,
    units: device.units.map((unit: any) => ({
      id: unit.unitId,
      name: unit.name,
    })),
  }));

  const result = {
    id: savedClient.id,
    name: savedClient.name,
    location: savedClient.location,
    type: savedClient.type,
    region: savedClient.region,
    city: savedClient.city,
    latitude: savedClient.latitude,
    longitude: savedClient.longitude,
    devices: devicesForApi,
    status: await StatusSchema.findOne({}),
    data: initialize ? await DataSchema.findOne({}) : null,
    errors: await ErrorSchema.findOne({}),
    updatedAt: toApiDateTimeStringOrNow(savedClient.updatedAt),
  };

  return {
    client: result,
    message: initialize ? '클라이언트가 생성되고 하드웨어가 초기화되었습니다.' : '클라이언트가 생성되었습니다.',
    ddcInitialization: initialize,
  };
}

async function clientRoutes(app: FastifyInstance) {
  logDebug('🚀 clientRoutes 플러그인 시작...');

  // GET /client
  app.get(
    CLIENT_ENDPOINTS.CLIENT,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logDebug('클라이언트 정보 조회 요청');

        const clientService = ServiceContainer.getInstance().getClientService();
        const client = await clientService.getFirstClient();

        if (!client) {
          logInfo('클라이언트 정보를 찾을 수 없습니다.');
          return handleHttpSuccess(ErrorMessages.TEST_CLIENT_NOT_FOUND, null, reply);
        }

        await ensurePeopleCounterIfNeeded(client.id);

        // 장비 조회
        const devices = await DeviceSchema.find({ clientId: client.id }).lean();

        // 각 장비별로 유닛 조회
        const devicesWithUnits = await Promise.all(
          devices.map(async (device) => {
            const units = await UnitSchema.find({ deviceId: device.deviceId, clientId: client.id }).lean();
            return { ...device, units };
          }),
        );

        // API 명세에 맞는 필드명 변환
        const devicesForApi = devicesWithUnits
          .filter((device) => device != null) // null/undefined 체크
          .map((device) => {
            if (!device) {
              return null;
            }

            const units = (device as any).units || [];

            return {
              id: device.deviceId,
              name: device.name,
              type: device.type,
              units: Array.isArray(units)
                ? units.map((unit: any) => ({
                    id: unit.unitId,
                    name: unit.name,
                  }))
                : [],
            };
          })
          .filter((device) => device != null); // null 제거

        const clientInfo = {
          id: client.id,
          name: client.name,
          location: client.location,
          city: client.city,
          type: client.type,
          region: client.region,
          latitude: client.latitude,
          longitude: client.longitude,
          devices: devicesForApi,
          updatedAt: toApiDateTimeStringOrNow(client.updatedAt),
        };

        logDebug(`클라이언트 정보 조회 성공: ${client.id}`);
        return handleHttpSuccess(ErrorMessages.TEST_CLIENT_SELECT_SUCCESS, clientInfo, reply);
      } catch (error) {
        logError(`클라이언트 정보 조회 실패: ${error}`);
        return handleRouteError(error, reply, 'client', '클라이언트 정보 조회 중 오류가 발생했습니다.');
      }
    },
  );

  // POST /client (클라이언트 등록/선택)
  app.post(
    CLIENT_ENDPOINTS.CLIENT,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logInfo('클라이언트 등록/선택 요청');

        // 1. 요청 검증 및 파싱
        const { clientId, initialize } = validateAndParseRequest(request);

        // 2. 기존 클라이언트 확인
        const existingClient = await ClientSchema.findOne({ id: clientId });

        // 3. 기존 클라이언트 처리
        if (existingClient && !initialize) {
          return await handleExistingClient(existingClient, reply);
        }

        // ⚠️ 외부(external) 경로에서의 DB 전체 재설정은 매우 위험할 수 있으므로,
        // 운영 환경에서 필요 시 ENV로 차단할 수 있게 한다. (기본값: 허용 → 기존 동작 보존)
        const requestPath = (request as any).url as string;
        const isExternalPath = typeof requestPath === 'string' && requestPath.startsWith('/api/v1/external/');
        const externalResetDisabled = String(process.env.EXTERNAL_CLIENT_RESET_DISABLED || '').toLowerCase() === 'true';
        if (isExternalPath && externalResetDisabled) {
          logWarn(`[client] 외부 경로에서 DB 재설정이 차단되었습니다 (ENV=EXTERNAL_CLIENT_RESET_DISABLED=true)`);
          return reply.code(403).send({
            success: false,
            message: '외부 경로에서는 클라이언트 재설정을 허용하지 않습니다.',
          });
        }
        if (isExternalPath) {
          logWarn(`[client] 외부 경로에서 클라이언트 재설정이 호출되었습니다 (initialize=${initialize})`);
        }

        // 4. 데이터베이스 재설정
        await resetDatabase(clientId, initialize);

        // 5. 클라이언트 생성
        const savedClient = await createClient(clientId);

        // 6. 장비/유닛 생성
        const clientUnitInfo = clientUnits[clientId as keyof typeof clientUnits];
        await createDevicesAndUnits(savedClient, clientUnitInfo, initialize);

        // 7. 하드웨어 초기화 (initialize가 true일 때만)
        if (initialize) {
          // DDC 하드웨어 초기화 실행
          logInfo(`DDC 하드웨어 초기화 시작: ${clientId}`);
          try {
            const serviceContainer = ServiceContainer.getInstance();
            const dataApplyService = serviceContainer.getDataApplyService();

            const ddcInitResult = await dataApplyService.initializeDDC(clientId);
            logInfo(`DDC 하드웨어 초기화 완료: ${clientId} - ${ddcInitResult.appliedDevices}개 포트 성공`);
          } catch (error) {
            logError(`DDC 하드웨어 초기화 실패: ${clientId} - ${error}`);
            // DDC 초기화 실패해도 클라이언트 생성은 계속 진행
          }

          await initializeHardware(clientId);
        }

        // 8. 응답 생성
        const response = await buildClientResponse(savedClient, initialize);

        return handleHttpSuccess(ErrorMessages.TEST_CLIENT_SELECT_SUCCESS, response, reply);
      } catch (error) {
        logError(`클라이언트 등록/선택 중 오류: ${error}`);
        return handleRouteError(error as any, reply, 'client', '클라이언트 등록 중 오류가 발생했습니다.');
      }
    },
  );

  // GET /client/schema (클라이언트 API 스키마)
  app.get(
    CLIENT_ENDPOINTS.SCHEMA,
    { preHandler: [app.requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.send(
          createSuccessResponse('클라이언트 API 스키마', {
            schema: ClientResponseSchema,
            example: CLIENT_RESPONSE_EXAMPLE,
            description: '클라이언트 정보 조회 API의 응답 구조와 예시 데이터입니다.',
            endpoints: [
              {
                path: '/api/v1/external/client',
                method: 'GET',
                description: '클라이언트 정보 조회',
              },
              {
                path: '/api/v1/external/clients',
                method: 'GET',
                description: '전체 클라이언트 목록 조회',
              },
              {
                path: '/api/v1/external/client',
                method: 'POST',
                description: '클라이언트 등록/선택',
              },
            ],
          }),
        );
      } catch (error) {
        return handleRouteError(error, reply, 'client', '클라이언트 스키마 조회 중 오류가 발생했습니다.');
      }
    },
  );
}

export default fp(clientRoutes);
