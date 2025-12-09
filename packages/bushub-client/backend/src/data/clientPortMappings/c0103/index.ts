import { COMMON_SYSTEM_PORTS } from '../common';

import { bench } from './bench';
import { cooler } from './cooler';
import { door } from './door';
import { exchanger } from './exchanger';
import { externalsw } from './externalsw';
import { integrated_sensor } from './integrated-sensor';
import { lighting } from './lighting';

export const c0103Mapping = {
  lighting,
  cooler,
  exchanger,
  bench,
  door,
  integrated_sensor,
  externalsw,
  ...COMMON_SYSTEM_PORTS,
};
