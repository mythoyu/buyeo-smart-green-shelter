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
  people_counter: [{ id: 'u001', name: '피플카운터' }],
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
    people_counter: [{ id: 'u001', name: '피플카운터' }],
  },
  c0102: {
    lighting: [{ id: 'u001', name: 'LED 조명' }],
    cooler: [{ id: 'u001', name: '냉난방기' }],
    bench: [{ id: 'u001', name: '스마트벤치' }],
    door: [{ id: 'u001', name: '자동문' }],
    people_counter: [{ id: 'u001', name: '피플카운터' }],
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

/** 신규 개소(c0104~): 이름·주소·좌표는 현장 확정 후 수정 */
const extraShelterClients: ClientData[] = [
  {
    id: 'c0104',
    name: '스마트그린쉼터 4',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2756,
    longitude: 126.9098,
    devices: devicesFromC0102Template(clientUnits.c0104),
  },
  {
    id: 'c0105',
    name: '스마트그린쉼터 5',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2758,
    longitude: 126.91,
    devices: devicesFromC0102Template(clientUnits.c0105),
  },
  {
    id: 'c0106',
    name: '스마트그린쉼터 6',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.276,
    longitude: 126.9102,
    devices: devicesFromC0102Template(clientUnits.c0106),
  },
  {
    id: 'c0107',
    name: '스마트그린쉼터 7',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2762,
    longitude: 126.9104,
    devices: devicesFromC0102Template(clientUnits.c0107),
  },
  {
    id: 'c0108',
    name: '스마트그린쉼터 8',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2764,
    longitude: 126.9106,
    devices: devicesFromC0102Template(clientUnits.c0108),
  },
  {
    id: 'c0109',
    name: '스마트그린쉼터 9',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2766,
    longitude: 126.9108,
    devices: devicesFromC0102Template(clientUnits.c0109),
  },
  {
    id: 'c0110',
    name: '스마트그린쉼터 10',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2768,
    longitude: 126.911,
    devices: devicesFromC0102Template(clientUnits.c0110),
  },
  {
    id: 'c0111',
    name: '스마트그린쉼터 11',
    location: '충청남도 부여군 (상세 주소 확정 시 수정)',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.277,
    longitude: 126.9112,
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
    name: '부여군청',
    location: '대한민국 충청남도 부여군 부여읍 사비로 33',
    region: 'by',
    city: '부여군',
    type: 'sm-shelter',
    latitude: 36.2754,
    longitude: 126.9096,
    devices: devicesFromC0102Template(clientUnits.c0103),
  },
  ...extraShelterClients,
];
