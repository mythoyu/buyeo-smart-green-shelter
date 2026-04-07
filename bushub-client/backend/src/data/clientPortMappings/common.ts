import { HW_PORTS } from '../../meta/hardware/ports';

// 🆕 모든 클라이언트에서 공통으로 사용되는 시스템 포트
export const COMMON_SYSTEM_PORTS = {
  // DDC 시스템 시간 설정
  ddc_time: {
    SET_YEAR: {
      port: HW_PORTS.DDC_TIME.YEAR.set,
      collection: 'ddcConfig',
      field: 'year',
      type: 'number',
    },
    GET_YEAR: {
      port: HW_PORTS.DDC_TIME.YEAR.get,
      collection: 'ddcConfig',
      field: 'year',
      type: 'number',
    },
    // 월 설정
    SET_MONTH: {
      port: HW_PORTS.DDC_TIME.MONTH.set,
      collection: 'ddcConfig',
      field: 'month',
      type: 'number',
    },
    GET_MONTH: {
      port: HW_PORTS.DDC_TIME.MONTH.get,
      collection: 'ddcConfig',
      field: 'month',
      type: 'number',
    },
    // 일 설정
    SET_DAY: {
      port: HW_PORTS.DDC_TIME.DAY.set,
      collection: 'ddcConfig',
      field: 'day',
      type: 'number',
    },
    GET_DAY: {
      port: HW_PORTS.DDC_TIME.DAY.get,
      collection: 'ddcConfig',
      field: 'day',
      type: 'number',
    },
    // 요일 설정
    SET_DOW: {
      port: HW_PORTS.DDC_TIME.DOW.set,
      collection: 'ddcConfig',
      field: 'dow',
      type: 'number',
    },
    GET_DOW: {
      port: HW_PORTS.DDC_TIME.DOW.get,
      collection: 'ddcConfig',
      field: 'dow',
      type: 'number',
    },
    // 시간 설정
    SET_HOUR: {
      port: HW_PORTS.DDC_TIME.HOUR.set,
      collection: 'ddcConfig',
      field: 'hour',
      type: 'number',
    },
    GET_HOUR: {
      port: HW_PORTS.DDC_TIME.HOUR.get,
      collection: 'ddcConfig',
      field: 'hour',
      type: 'number',
    },
    SET_MINUTE: {
      port: HW_PORTS.DDC_TIME.MIN.set,
      collection: 'ddcConfig',
      field: 'minute',
      type: 'number',
    },
    GET_MINUTE: {
      port: HW_PORTS.DDC_TIME.MIN.get,
      collection: 'ddcConfig',
      field: 'minute',
      type: 'number',
    },
    SET_SECOND: {
      port: HW_PORTS.DDC_TIME.SECOND.set,
      collection: 'ddcConfig',
      field: 'second',
      type: 'number',
    },
    GET_SECOND: {
      port: HW_PORTS.DDC_TIME.SECOND.get,
      collection: 'ddcConfig',
      field: 'second',
      type: 'number',
    },
  },

  // 절기 설정
  seasonal: {
    GET_SEASON: {
      port: HW_PORTS.SEASONAL.SEASON.get,
      collection: 'ddcConfig',
      field: 'season',
      type: 'number',
    },

    // 월별 하절기 설정
    SET_JAN_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JAN.set,
      collection: 'ddcConfig',
      field: 'january',
      type: 'number',
    },
    GET_JAN_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JAN.get,
      collection: 'ddcConfig',
      field: 'january',
      type: 'number',
    },
    SET_FEB_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.FEB.set,
      collection: 'ddcConfig',
      field: 'february',
      type: 'number',
    },
    GET_FEB_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.FEB.get,
      collection: 'ddcConfig',
      field: 'february',
      type: 'number',
    },
    SET_MAR_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.MAR.set,
      collection: 'ddcConfig',
      field: 'march',
      type: 'number',
    },
    GET_MAR_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.MAR.get,
      collection: 'ddcConfig',
      field: 'march',
      type: 'number',
    },
    SET_APR_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.APR.set,
      collection: 'ddcConfig',
      field: 'april',
      type: 'number',
    },
    GET_APR_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.APR.get,
      collection: 'ddcConfig',
      field: 'april',
      type: 'number',
    },
    SET_MAY_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.MAY.set,
      collection: 'ddcConfig',
      field: 'may',
      type: 'number',
    },
    GET_MAY_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.MAY.get,
      collection: 'ddcConfig',
      field: 'may',
      type: 'number',
    },
    SET_JUN_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JUN.set,
      collection: 'ddcConfig',
      field: 'june',
      type: 'number',
    },
    GET_JUN_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JUN.get,
      collection: 'ddcConfig',
      field: 'june',
      type: 'number',
    },
    SET_JUL_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JUL.set,
      collection: 'ddcConfig',
      field: 'july',
      type: 'number',
    },
    GET_JUL_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.JUL.get,
      collection: 'ddcConfig',
      field: 'july',
      type: 'number',
    },
    SET_AUG_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.AUG.set,
      collection: 'ddcConfig',
      field: 'august',
      type: 'number',
    },
    GET_AUG_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.AUG.get,
      collection: 'ddcConfig',
      field: 'august',
      type: 'number',
    },
    SET_SEP_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.SEP.set,
      collection: 'ddcConfig',
      field: 'september',
      type: 'number',
    },
    GET_SEP_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.SEP.get,
      collection: 'ddcConfig',
      field: 'september',
      type: 'number',
    },
    SET_OCT_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.OCT.set,
      collection: 'ddcConfig',
      field: 'october',
      type: 'number',
    },
    GET_OCT_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.OCT.get,
      collection: 'ddcConfig',
      field: 'october',
      type: 'number',
    },
    SET_NOV_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.NOV.set,
      collection: 'ddcConfig',
      field: 'november',
      type: 'number',
    },
    GET_NOV_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.NOV.get,
      collection: 'ddcConfig',
      field: 'november',
      type: 'number',
    },
    SET_DEC_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.DEC.set,
      collection: 'ddcConfig',
      field: 'december',
      type: 'number',
    },
    GET_DEC_SUMMER: {
      port: HW_PORTS.SEASONAL.MONTHLY_SUMMER.DEC.get,
      collection: 'ddcConfig',
      field: 'december',
      type: 'number',
    },
  },
} as const;
