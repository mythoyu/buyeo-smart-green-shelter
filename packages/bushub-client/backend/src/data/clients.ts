// 타입 정의 import
// 명령어 import
import { commonCommands } from './commands';

// 매핑 import
import { deviceMapping, deviceMappingHelpers } from './mappings';

// 헬퍼 함수 import
import type { CommandData, UnitData, DeviceData, ClientData } from './types';

// 타입과 함수들을 export
export type { CommandData, UnitData, DeviceData, ClientData };
export { commonCommands, deviceMapping, deviceMappingHelpers };

// 공통 디바이스 정의
export const commonDevices = {
  lighting: { id: 'd011', name: '조명' },
  cooler: { id: 'd021', name: '냉난방기' },
  exchanger: { id: 'd022', name: '전열교환기' },
  aircurtain: { id: 'd031', name: '에어커튼' },
  bench: { id: 'd041', name: '벤치' },
  door: { id: 'd051', name: '자동문' },
  integrated_sensor: { id: 'd061', name: '통합센서' },
  externalsw: { id: 'd081', name: '자동문외부스위치' },
};

// 클라이언트별 유닛 구성
export const clientUnits = {
  c0101: {
    lighting: [
      { id: 'u001', name: 'LED 조명' },
      { id: 'u003', name: '캐릭터구조물' },
      { id: 'u004', name: '버스사각등' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기' }],
    bench: [{ id: 'u001', name: '스마트벤치' }],
    door: [{ id: 'u001', name: '자동문' }],
  },
  c0102: {
    lighting: [{ id: 'u001', name: 'LED 조명' }],
    cooler: [{ id: 'u001', name: '냉난방기' }],
    bench: [{ id: 'u001', name: '스마트벤치' }],
    door: [{ id: 'u001', name: '자동문' }],
  },
};

// 디바이스 생성 헬퍼 함수
function createDevice(deviceType: keyof typeof commonDevices, units: UnitData[]): DeviceData {
  const device = commonDevices[deviceType];
  const commands = commonCommands[deviceType];

  return {
    id: device.id,
    name: device.name,
    type: deviceType,
    units,
    commands,
  };
}

// 클라이언트 데이터
export const clients: ClientData[] = [
  {
    id: 'c0101',
    name: '세도면사무소',
    location: '세도면 청송리 426-1',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.170399,
    longitude: 126.946108,
    devices: [
      createDevice('lighting', clientUnits.c0101.lighting),
      createDevice('cooler', clientUnits.c0101.cooler),
      createDevice('bench', clientUnits.c0101.bench),
      createDevice('door', clientUnits.c0101.door),
    ],
  },
  {
    id: 'c0102',
    name: '정림사지입구',
    location: '충청남도 부여군 동남리 765-1',
    region: 'by',
    city: '부여군',
    type: 'sm-restplace',
    latitude: 36.278824,
    longitude: 126.912761,
    devices: [
      createDevice('lighting', clientUnits.c0102.lighting),
      createDevice('cooler', clientUnits.c0102.cooler),
      createDevice('bench', clientUnits.c0102.bench),
      createDevice('door', clientUnits.c0102.door),
    ],
  },
  // 추가 클라이언트는 필요 시 확장
];
