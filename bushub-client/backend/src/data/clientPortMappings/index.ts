import { c0101Mapping } from './c0101';
import { c0102Mapping } from './c0102';
import { c0103Mapping } from './c0103';

// c0103과 동일 DDC 매핑을 LG 표준 현장(c0103~c0111)에 공유 (현장별 DO 차이는 추후 분리 가능)
const lgShelterPortMapping = c0103Mapping;

// 클라이언트별 포트 매핑 정의
export const CLIENT_PORT_MAPPINGS = {
  c0101: c0101Mapping,
  c0102: c0102Mapping,
  c0103: lgShelterPortMapping,
  c0104: lgShelterPortMapping,
  c0105: lgShelterPortMapping,
  c0106: lgShelterPortMapping,
  c0107: lgShelterPortMapping,
  c0108: lgShelterPortMapping,
  c0109: lgShelterPortMapping,
  c0110: lgShelterPortMapping,
  c0111: lgShelterPortMapping,
};
