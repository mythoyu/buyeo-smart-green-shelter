import { HW_PORTS } from '../../../meta/hardware/ports';

export const integrated_sensor = {
  u001: {
    GET_PM100: {
      port: HW_PORTS.INTEGRATED_SENSOR.PM100.get,
      collection: 'data',
      field: 'pm100',
      type: 'number',
    },
    GET_PM25: {
      port: HW_PORTS.INTEGRATED_SENSOR.PM25.get,
      collection: 'data',
      field: 'pm25',
      type: 'number',
    },
    GET_PM10: {
      port: HW_PORTS.INTEGRATED_SENSOR.PM10.get,
      collection: 'data',
      field: 'pm10',
      type: 'number',
    },
    GET_CO2: {
      port: HW_PORTS.INTEGRATED_SENSOR.CO2.get,
      collection: 'data',
      field: 'co2',
      type: 'number',
    },
    GET_VOC: {
      port: HW_PORTS.INTEGRATED_SENSOR.VOC.get,
      collection: 'data',
      field: 'voc',
      type: 'number',
    },
    GET_HUM: {
      port: HW_PORTS.INTEGRATED_SENSOR.HUM.get,
      collection: 'data',
      field: 'hum',
      type: 'number',
    },
    GET_TEMP: {
      port: HW_PORTS.INTEGRATED_SENSOR.TEMP.get,
      collection: 'data',
      field: 'temp',
      type: 'number',
    },
  },
};
