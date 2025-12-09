// 먼저 모든 명령어 배열을 import
import { aircurtainCommands } from './aircurtain';
import { benchCommands } from './bench';
import { coolerCommands } from './cooler';
import { doorCommands } from './door';
import { exchangerCommands } from './exchanger';
import { externalswCommands } from './externalsw';
import { integratedSensorCommands } from './integrated_sensor';
import { lightingCommands } from './lighting';

export const commonCommands = {
  lighting: lightingCommands,
  cooler: coolerCommands,
  exchanger: exchangerCommands,
  aircurtain: aircurtainCommands,
  bench: benchCommands,
  door: doorCommands,
  integrated_sensor: integratedSensorCommands,
  externalsw: externalswCommands,
};

// 개별 명령어 배열도 export
export { lightingCommands } from './lighting';
export { coolerCommands } from './cooler';
export { exchangerCommands } from './exchanger';
export { aircurtainCommands } from './aircurtain';
export { benchCommands } from './bench';
export { doorCommands } from './door';
export { integratedSensorCommands } from './integrated_sensor';
export { externalswCommands } from './externalsw';
