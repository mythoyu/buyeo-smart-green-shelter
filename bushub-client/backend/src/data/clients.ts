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
  people_counter: { id: 'd082', name: '피플카운터' },
};

/** c0102~c0111: 피플카운터 1대(u001). PEOPLE_COUNTER_PORTS는 현장 ENV와 맞출 것 */
const peopleCounterUnitsSingle: UnitData[] = [{ id: 'u001', name: '피플카운터 1' }];

/** c0101(세도면사무소): 피플카운터 2대(u001, u002) */
const peopleCounterUnitsC0101: UnitData[] = [
  { id: 'u001', name: '피플카운터 1' },
  { id: 'u002', name: '피플카운터 2' },
];

/** c0102와 동일 + 피플카운터 (c0103~c0111, LG 냉난방 템플릿) */
const unitsC0102TemplateWithPeople: {
  lighting: UnitData[];
  cooler: UnitData[];
  bench: UnitData[];
  door: UnitData[];
  people_counter: UnitData[];
} = {
  lighting: [{ id: 'u001', name: 'LED 조명' }],
  cooler: [{ id: 'u001', name: '냉난방기' }],
  bench: [{ id: 'u001', name: '스마트벤치' }],
  door: [{ id: 'u001', name: '자동문' }],
  people_counter: peopleCounterUnitsSingle,
};

// 클라이언트별 유닛 구성
export const clientUnits = {
  c0101: {
    lighting: [
      { id: 'u001', name: 'LED 조명' },
      { id: 'u003', name: '간판등' },
      { id: 'u004', name: '버스사각등' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기' }],
    bench: [{ id: 'u001', name: '스마트벤치' }],
    door: [{ id: 'u001', name: '자동문' }],
    people_counter: peopleCounterUnitsC0101,
  },
  c0102: {
    lighting: [{ id: 'u001', name: 'LED 조명' }],
    cooler: [{ id: 'u001', name: '냉난방기' }],
    bench: [{ id: 'u001', name: '스마트벤치' }],
    door: [{ id: 'u001', name: '자동문' }],
    people_counter: peopleCounterUnitsSingle,
  },
  c0103: unitsC0102TemplateWithPeople,
  c0104: unitsC0102TemplateWithPeople,
  c0105: unitsC0102TemplateWithPeople,
  c0106: unitsC0102TemplateWithPeople,
  c0107: unitsC0102TemplateWithPeople,
  c0108: unitsC0102TemplateWithPeople,
  c0109: unitsC0102TemplateWithPeople,
  c0110: unitsC0102TemplateWithPeople,
  c0111: unitsC0102TemplateWithPeople,
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
    commands: [...commands],
  };
}

function devicesFromC0102Template(units: typeof unitsC0102TemplateWithPeople): DeviceData[] {
  return [
    createDevice('lighting', units.lighting),
    createDevice('cooler', units.cooler),
    createDevice('bench', units.bench),
    createDevice('door', units.door),
    createDevice('people_counter', units.people_counter),
  ];
}

/** 부여 스마트그린쉼터 확정 개소(c0104~c0111): 지도 좌표는 현장 GPS로 재확인 권장 */
const extraShelterClients: ClientData[] = [
  {
    id: 'c0104',
    name: '부여고등학교',
    location: '부여읍 가탑리 393-30',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.272729,
    longitude: 126.923468,
    devices: devicesFromC0102Template(clientUnits.c0104),
  },
  {
    id: 'c0105',
    name: '규암초등학교',
    location: '규암면 외리 217-37',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.275273,
    longitude: 126.880565,
    devices: devicesFromC0102Template(clientUnits.c0105),
  },
  {
    id: 'c0106',
    name: '규암농협앞',
    location: '규암면 규암리 35-1',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.267572,
    longitude: 126.859753,
    devices: devicesFromC0102Template(clientUnits.c0106),
  },
  {
    id: 'c0107',
    name: '규암아트큐브',
    location: '규암면 규암리 155-16',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.276,
    longitude: 126.885,
    devices: devicesFromC0102Template(clientUnits.c0107),
  },
  {
    id: 'c0108',
    name: '전통문화대학교',
    location: '규암면 합정리 603',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.307857,
    longitude: 126.896571,
    devices: devicesFromC0102Template(clientUnits.c0108),
  },
  {
    id: 'c0109',
    name: '외산면',
    location: '외산면 만수리 4-2',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.304336,
    longitude: 126.704213,
    devices: devicesFromC0102Template(clientUnits.c0109),
  },
  {
    id: 'c0110',
    name: '홍산면',
    location: '홍산면 북촌리 178-4',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.22572,
    longitude: 126.76547,
    devices: devicesFromC0102Template(clientUnits.c0110),
  },
  {
    id: 'c0111',
    name: '석성면',
    location: '석성면 석성리 764-20',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.236222,
    longitude: 126.997715,
    devices: devicesFromC0102Template(clientUnits.c0111),
  },
];

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
      createDevice('people_counter', clientUnits.c0101.people_counter),
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
    devices: devicesFromC0102Template(clientUnits.c0102),
  },
  {
    id: 'c0103',
    name: '부여읍관광주차장',
    location: '부여읍 성왕로 243',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.283713,
    longitude: 126.913124,
    devices: devicesFromC0102Template(clientUnits.c0103),
  },
  ...extraShelterClients,
];
