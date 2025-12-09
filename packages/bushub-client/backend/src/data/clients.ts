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
      { id: 'u001', name: '내부조명1' },
      { id: 'u002', name: '내부조명2' },
      { id: 'u003', name: '외부조명1' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기1' }],
    exchanger: [{ id: 'u001', name: '전열교환기1' }],
    // aircurtain: [
    //   { id: 'u001', name: '에어커튼1' },
    //   { id: 'u002', name: '에어커튼2' },
    // ],
    bench: [
      { id: 'u001', name: '내부벤치1' },
      { id: 'u002', name: '내부벤치2' },
    ],
    door: [
      { id: 'u001', name: '자동문1' },
      { id: 'u002', name: '자동문2' },
    ],
    integrated_sensor: [{ id: 'u001', name: '통합센서1' }],
    externalsw: [
      { id: 'u001', name: '자동문외부스위치1' },
      { id: 'u002', name: '자동문외부스위치2' },
    ],
  },
  c0102: {
    lighting: [
      { id: 'u001', name: '내부조명1' },
      { id: 'u002', name: '내부조명2' },
      { id: 'u003', name: '외부조명1' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기1' }],
    exchanger: [{ id: 'u001', name: '전열교환기1' }],
    // aircurtain: [
    //   { id: 'u001', name: '에어커튼1' },
    //   { id: 'u002', name: '에어커튼2' },
    // ],
    bench: [
      { id: 'u001', name: '내부벤치1' },
      { id: 'u002', name: '내부벤치2' },
    ],
    door: [
      { id: 'u001', name: '자동문1' },
      { id: 'u002', name: '자동문2' },
    ],
    integrated_sensor: [{ id: 'u001', name: '통합센서1' }],
    externalsw: [
      { id: 'u001', name: '자동문외부스위치1' },
      { id: 'u002', name: '자동문외부스위치2' },
    ],
  },
  c0103: {
    lighting: [
      { id: 'u001', name: '내부조명1' },
      { id: 'u002', name: '내부조명2' },
      { id: 'u003', name: '외부조명1' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기1' }],
    exchanger: [{ id: 'u001', name: '전열교환기1' }],
    // aircurtain: [{ id: 'u001', name: '에어커튼1' }],
    bench: [
      { id: 'u001', name: '내부벤치1' },
      { id: 'u002', name: '내부벤치2' },
    ],
    door: [{ id: 'u001', name: '자동문1' }],
    integrated_sensor: [{ id: 'u001', name: '통합센서1' }],
    externalsw: [{ id: 'u001', name: '자동문외부스위치1' }],
  },
  c0104: {
    lighting: [
      { id: 'u001', name: '내부조명1' },
      { id: 'u002', name: '내부조명2' },
      { id: 'u003', name: '외부조명1' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기1' }],
    exchanger: [{ id: 'u001', name: '전열교환기1' }],
    // aircurtain: [
    //   { id: 'u001', name: '에어커튼1' },
    //   { id: 'u002', name: '에어커튼2' },
    // ],
    bench: [
      { id: 'u001', name: '내부벤치1' },
      { id: 'u002', name: '내부벤치2' },
    ],
    door: [
      { id: 'u001', name: '자동문1' },
      { id: 'u002', name: '자동문2' },
    ],
    integrated_sensor: [{ id: 'u001', name: '통합센서1' }],
    externalsw: [
      { id: 'u001', name: '자동문외부스위치1' },
      { id: 'u002', name: '자동문외부스위치2' },
    ],
  },
  c0105: {
    lighting: [
      { id: 'u001', name: '내부조명1' },
      { id: 'u002', name: '외부조명1' },
    ],
    cooler: [{ id: 'u001', name: '냉난방기1' }],
    // exchanger: [{ id: 'u001', name: '전열교환기1' }],
    // aircurtain: [
    //   { id: 'u001', name: '에어커튼1' },
    //   { id: 'u002', name: '에어커튼2' },
    //   { id: 'u003', name: '에어커튼3' },
    // ],
    // bench: [
    //   { id: 'u001', name: '내부벤치1' },
    //   { id: 'u002', name: '내부벤치2' },
    // ],
    door: [
      { id: 'u001', name: '자동문1' },
      { id: 'u002', name: '자동문2' },
      { id: 'u003', name: '자동문3' },
    ],
    // integrated_sensor: [{ id: 'u001', name: '통합센서1' }],
    externalsw: [
      { id: 'u001', name: '자동문외부스위치1' },
      { id: 'u002', name: '자동문외부스위치2' },
      { id: 'u003', name: '자동문외부스위치3' },
    ],
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
    name: '강릉시외버스터미널',
    location: '강원도 강릉시 하슬라로 27',
    region: '강원도',
    city: '강릉시',
    type: 'bushub',
    latitude: 37.754692,
    longitude: 128.878805,
    devices: [
      createDevice('lighting', clientUnits.c0101.lighting),
      createDevice('cooler', clientUnits.c0101.cooler),
      createDevice('exchanger', clientUnits.c0101.exchanger),
      // createDevice('aircurtain', clientUnits.c0101.aircurtain),
      createDevice('bench', clientUnits.c0101.bench),
      createDevice('door', clientUnits.c0101.door),
      createDevice('integrated_sensor', clientUnits.c0101.integrated_sensor),
      createDevice('externalsw', clientUnits.c0101.externalsw),
    ],
  },
  {
    id: 'c0102',
    name: '구름다리',
    location: '강원도 강릉시 구름다리길 1',
    region: '강원도',
    city: '강릉시',
    type: 'bushub',
    latitude: 37.754692,
    longitude: 128.878805,
    devices: [
      createDevice('lighting', clientUnits.c0102.lighting),
      createDevice('cooler', clientUnits.c0102.cooler),
      createDevice('exchanger', clientUnits.c0102.exchanger),
      // createDevice('aircurtain', clientUnits.c0102.aircurtain),
      createDevice('bench', clientUnits.c0102.bench),
      createDevice('door', clientUnits.c0102.door),
      createDevice('integrated_sensor', clientUnits.c0102.integrated_sensor),
      createDevice('externalsw', clientUnits.c0102.externalsw),
    ],
  },
  {
    id: 'c0103',
    name: '안목커피거리',
    location: '강원도 강릉시 안목동 123-45',
    region: '강원도',
    city: '강릉시',
    type: 'bushub',
    latitude: 37.754692,
    longitude: 128.878805,
    devices: [
      createDevice('lighting', clientUnits.c0103.lighting),
      createDevice('cooler', clientUnits.c0103.cooler),
      createDevice('exchanger', clientUnits.c0103.exchanger),
      // createDevice('aircurtain', clientUnits.c0103.aircurtain),
      createDevice('bench', clientUnits.c0103.bench),
      createDevice('door', clientUnits.c0103.door),
      createDevice('integrated_sensor', clientUnits.c0103.integrated_sensor),
      createDevice('externalsw', clientUnits.c0103.externalsw),
    ],
  },
  {
    id: 'c0104',
    name: '홍제동주민센터(노인복지회관 앞)',
    location: '강원도 강릉시 홍제동 96-9, 경강로',
    region: '강원도',
    city: '강릉시',
    type: 'bushub',
    latitude: 37.7559,
    longitude: 128.9008,
    devices: [
      createDevice('lighting', clientUnits.c0104.lighting),
      createDevice('cooler', clientUnits.c0104.cooler),
      createDevice('exchanger', clientUnits.c0104.exchanger),
      // createDevice('aircurtain', clientUnits.c0104.aircurtain),
      createDevice('bench', clientUnits.c0104.bench),
      createDevice('door', clientUnits.c0104.door),
      createDevice('integrated_sensor', clientUnits.c0104.integrated_sensor),
      createDevice('externalsw', clientUnits.c0104.externalsw),
    ],
  },
  {
    id: 'c0105',
    name: '회산승강장',
    location: '강원도 강릉시 회산동 123-45',
    region: '강원도',
    city: '강릉시',
    type: 'bushub',
    latitude: 37.754692,
    longitude: 128.878805,
    devices: [
      createDevice('lighting', clientUnits.c0105.lighting),
      createDevice('cooler', clientUnits.c0105.cooler),
      // createDevice('exchanger', clientUnits.c0105.exchanger),
      // createDevice('aircurtain', clientUnits.c0105.aircurtain),
      // createDevice('bench', clientUnits.c0105.bench),
      createDevice('door', clientUnits.c0105.door),
      // createDevice('integrated_sensor', clientUnits.c0105.integrated_sensor),
      createDevice('externalsw', clientUnits.c0105.externalsw),
    ],
  },
];
