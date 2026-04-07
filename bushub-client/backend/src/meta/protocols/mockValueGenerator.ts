import { ServiceContainer } from '../../core/container/ServiceContainer';
import { CLIENT_PORT_MAPPINGS } from '../../data/clientPortMappings';
import { logDebug, logInfo, logWarn } from '../../logger';

export interface PortSpec {
  field?: string;
  type?: 'boolean' | 'number' | 'string' | 'float' | string;
  deviceType?: string;
}

export interface ReverseIndexSpec extends PortSpec {
  functionCode: number;
  address: number;
  clientId?: string; // 클라이언트 ID (c0101, c0102, c0103 …)
}

const makeKey = (functionCode: number, address: number): string => `${functionCode}:${address}`;

// ServiceContainer 전역 변수
let serviceContainer: ServiceContainer | null = null;

/**
 * Mock 데이터 생성기 초기화 (ServiceContainer 주입)
 */
export const initializeMockGenerator = (container: ServiceContainer): void => {
  serviceContainer = container;
};

export const buildReverseIndex = (): Map<string, ReverseIndexSpec> => {
  const index = new Map<string, ReverseIndexSpec>();
  try {
    const clients = CLIENT_PORT_MAPPINGS as any;
    for (const [clientId, clientMapping] of Object.entries(clients)) {
      if (!clientMapping || typeof clientMapping !== 'object') continue;
      for (const [deviceType, deviceMapping] of Object.entries(clientMapping as any)) {
        if (!deviceMapping || typeof deviceMapping !== 'object') continue;
        for (const [unitId, unitMapping] of Object.entries(deviceMapping as any)) {
          if (!unitMapping || typeof unitMapping !== 'object') continue;
          for (const [actionKey, actionSpec] of Object.entries(unitMapping as any)) {
            const spec: any = actionSpec;
            if (spec === 'TIME_INTEGRATED') continue;
            if (
              spec &&
              spec.port &&
              typeof spec.port.functionCode === 'number' &&
              typeof spec.port.address === 'number'
            ) {
              const key = makeKey(spec.port.functionCode, spec.port.address);
              // 같은 address를 사용하는 경우 마지막 클라이언트의 clientId 저장
              index.set(key, {
                functionCode: spec.port.functionCode,
                address: spec.port.address,
                field: spec.field,
                type: spec.type,
                deviceType,
                clientId, // 클라이언트 ID 저장
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logWarn('[mockValueGenerator] Failed to build reverse index:', error);
  }
  return index;
};

export const generateBySpec = async (
  spec: ReverseIndexSpec | undefined,
  length: number,
): Promise<(number | boolean)[]> => {
  const results: (number | boolean)[] = [];
  for (let i = 0; i < Math.max(1, length); i += 1) {
    results.push(await generateSingle(spec));
  }
  return results;
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 파인튜닝값 조회 (DB에서)
 */
const getTuningValue = async (field: string): Promise<number> => {
  if (!serviceContainer) {
    logWarn('[mockValueGenerator] ServiceContainer가 초기화되지 않음, 기본값 0 사용');
    return 0;
  }

  try {
    const systemService = serviceContainer.getSystemService();
    const settings = await systemService.getDeviceAdvancedSettings();

    if (!settings) {
      logWarn('[mockValueGenerator] 디바이스 상세설정을 찾을 수 없음, 기본값 0 사용');
      return 0;
    }

    if (field === 'summer_cont_temp') {
      const tuningValue = settings.temp['fine-tuning-summer'] || 0;
      logDebug(`[mockValueGenerator] 여름 목표온도 튜닝값: ${tuningValue}°C`);
      return tuningValue;
    }
    if (field === 'winter_cont_temp') {
      const tuningValue = settings.temp['fine-tuning-winter'] || 0;
      logDebug(`[mockValueGenerator] 겨울 목표온도 튜닝값: ${tuningValue}°C`);
      return tuningValue;
    }

    return 0;
  } catch (error) {
    logWarn(`[mockValueGenerator] 튜닝값 조회 실패: ${error}, 기본값 0 사용`);
    return 0;
  }
};

const generateSingle = async (spec?: ReverseIndexSpec): Promise<number | boolean> => {
  if (!spec) {
    return randomInt(200, 1200);
  }

  const field = spec.field || '';
  const type = (spec.type || '').toString();
  const deviceType = (spec.deviceType || '').toString();

  // boolean 계열
  if (type === 'boolean' || field === 'auto' || field === 'power') {
    return Math.random() > 0.5 ? 1 : 0;
  }

  // 시간/분 필드
  if (field.includes('hour')) return randomInt(0, 23);
  if (field.includes('minute')) return randomInt(0, 59);

  // 온도 관련 (파인튜닝값 적용하여 Modbus 원시 값 반환)
  if (field.includes('summer_cont_temp') || field.includes('winter_cont_temp')) {
    const tuningValue = await getTuningValue(field);
    const baseTemp = randomInt(160, 300); // 기본 온도 범위 160~300 (Modbus 원시 값)
    const adjustedTemp = baseTemp + tuningValue * 10; // 튜닝값 적용
    const modbusValue = adjustedTemp; // Modbus 값으로 변환
    logInfo(
      `[mockValueGenerator] 온도 생성: ${field} = ${baseTemp}°C + ${tuningValue}°C = ${adjustedTemp}°C → ${modbusValue}`,
    );
    return modbusValue;
  }
  if (field === 'cur_temp') {
    return randomInt(1010, 2990); // -99~99°C → 1010~2990 (Modbus 값)
  }

  // 장비별 모드/속도
  if (deviceType === 'cooler') {
    if (field === 'mode') return randomInt(0, 4);
    if (field === 'speed') return randomInt(1, 4);
    if (field === 'alarm') {
      // 🆕 냉난방기 Alarm 에러 테스트 로직
      return await generateAlarmErrorValue(deviceType, field);
    }
  }
  if (deviceType === 'exchanger') {
    if (field === 'mode') return randomInt(1, 2);
    if (field === 'speed') return randomInt(1, 4);
    if (field === 'alarm') {
      // 🆕 전열교환기 Alarm 에러 테스트 로직
      return await generateAlarmErrorValue(deviceType, field);
    }
  }

  // 통합 센서 값 범위 (README 기준)
  if (deviceType === 'integrated_sensor' || deviceType === 'sensor') {
    if (field === 'pm100' || field === 'pm25' || field === 'pm10') return randomInt(0, 1000);
    if (field === 'co2') return randomInt(400, 10000);
    if (field === 'voc') return randomInt(0, 60000);
    if (field === 'hum') return randomInt(0, 1000) / 10; // 0.0~100.0%
    if (field === 'temp') {
      // integrated_sensor의 temp: -40°C~125°C → 1600~3250 (Modbus 원시 값)
      return randomInt(1600, 3250);
    }
    if (field === 'alarm') {
      // 🆕 통합센서 Alarm 에러 테스트 로직
      return await generateAlarmErrorValue(deviceType, field);
    }
  }

  // 기본 숫자 범위
  if (type === 'number' || type === 'float' || type === 'string') {
    return randomInt(1, 100);
  }

  // 마지막 폴백
  return randomInt(200, 1200);
};

/**
 * 🆕 Alarm 에러 값 생성 (Mock 테스트용)
 */
const generateAlarmErrorValue = async (deviceType: string, field: string): Promise<number> => {
  try {
    // ServiceContainer에서 MockModbusService 가져오기
    if (!serviceContainer) {
      logWarn('[mockValueGenerator] ServiceContainer가 초기화되지 않음 - 기본값 0 반환');
      return 0;
    }

    const unifiedModbusService = serviceContainer.getUnifiedModbusService();
    if (!unifiedModbusService) {
      logWarn('[mockValueGenerator] UnifiedModbusService를 찾을 수 없음 - 기본값 0 반환');
      return 0;
    }

    // UnifiedModbusCommunicationService에서 MockModbusService 가져오기
    const communicationService = (unifiedModbusService as any).communicationService;
    if (!communicationService || !communicationService.mockService) {
      logWarn('[mockValueGenerator] MockModbusService를 찾을 수 없음 - 기본값 0 반환');
      return 0;
    }

    const mockModbusService = communicationService.mockService;

    // MockModbusService의 Alarm 에러 테스트 상태 확인
    const alarmTestStatus = mockModbusService.getAlarmErrorTestStatus();
    if (!alarmTestStatus.enabled) {
      // 테스트 모드가 비활성화된 경우 정상값(0) 반환
      return 0;
    }

    // 디바이스 타입이 일치하는지 확인
    const targetDeviceType = alarmTestStatus.deviceType;
    if (targetDeviceType !== 'all' && targetDeviceType !== deviceType) {
      // 해당 디바이스 타입이 아닌 경우 정상값(0) 반환
      return 0;
    }

    // Alarm 에러 테스트 값 반환
    const alarmValue = alarmTestStatus.value;
    logInfo(`[mockValueGenerator] Alarm 에러 테스트 값 생성: ${deviceType}/${field} = ${alarmValue}`);
    return alarmValue;
  } catch (error) {
    logWarn(`[mockValueGenerator] Alarm 에러 값 생성 실패: ${error} - 기본값 0 반환`);
    return 0;
  }
};
