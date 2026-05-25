export interface ModbusCommand {
  name: string;
  description: string;
  functionCode: 1 | 3 | 4 | 5 | 6 | 15 | 16; // Read Coils(1), Read Holding(3), Read Input(4), Write Coil(5), Write Single Register(6), Write Coils(15), Write Multiple Registers(16)
  address: number; // 0-based address
  value?: number;
  length?: number;
}

export const INTEGRATED_SENSOR_COMMAND_MAP: { [key: string]: ModbusCommand } = {
  // d061 통합센서
  GET_PM100: { name: 'Get PM10.0', description: '미세먼지(PM10) 농도 취득', functionCode: 4, address: 20, length: 1 },
  GET_PM25: {
    name: 'Get PM2.5',
    description: '초미세먼지(PM2.5) 농도 취득',
    functionCode: 4,
    address: 21,
    length: 1,
  },
  GET_PM10: {
    name: 'Get PM1.0',
    description: '초초미세먼지(PM1.0) 농도 취득',
    functionCode: 4,
    address: 22,
    length: 1,
  },
  GET_CO2: { name: 'Get CO2', description: '이산화탄소 농도 취득', functionCode: 4, address: 23, length: 1 },
  GET_VOC: { name: 'Get VOC', description: '유기화합물 농도 취득', functionCode: 4, address: 24, length: 1 },
  GET_HUM: { name: 'Get Humidity', description: '습도 취득', functionCode: 4, address: 25, length: 1 },
  GET_TEMP: { name: 'Get Temperature', description: '온도 취득', functionCode: 4, address: 26, length: 1 },
};
