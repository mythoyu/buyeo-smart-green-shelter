import { COMMON_SYSTEM_PORTS } from '../common';

import { bench } from './bench';
import { cooler } from './cooler';
import { door } from './door';
import { lighting } from './lighting';

export const c0101Mapping = {
  lighting,
  cooler,
  bench,
  door,
  ...COMMON_SYSTEM_PORTS,
};
