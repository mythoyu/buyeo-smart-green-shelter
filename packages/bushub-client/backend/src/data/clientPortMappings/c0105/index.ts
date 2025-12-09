import { COMMON_SYSTEM_PORTS } from '../common';

import { cooler } from './cooler';
import { door } from './door';
import { externalsw } from './externalsw';
// import { integrated_sensor } from './integrated-sensor';
import { lighting } from './lighting';

export const c0105Mapping = {
  lighting,
  cooler,
  door,
  // integrated_sensor,
  externalsw,
  ...COMMON_SYSTEM_PORTS,
};
