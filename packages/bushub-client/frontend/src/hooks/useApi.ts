import {
  useGetClient,
  useGetClientStatus,
  useGetClientData,
  useGetClientErrors,
  useGetClients,
  useSelectClient,
  useGetDevices,
  useRegisterDevice, // UseMutationResult를 반환할 수 있음
  useGetApiKeys,
  useCreateApiKey, // UseMutationResult를 반환할 수 있음
  useDeleteApiKey, // UseMutationResult를 반환할 수 있음
  useGetLogs,
  useGetLogFiles,
  useGetLogContent,
  useSearchLogs,
  useGetLogStats,
  useLogin, // UseMutationResult를 반환할 수 있음
  useLogout, // UseMutationResult를 반환할 수 있음
  useChangePassword,
  // 새로운 시스템 API 훅들
  useGetSystemSettings,
  useGetNtpStatus,
  useSetNtpServer,
  useSetNetworkDhcp,
  useSetNetworkStatic,
  useGetSoftapStatus,
  useSetSoftap,
} from '../api/queries';

// 🆕 새로운 하드웨어 제어 훅들 import (임시로 주석 처리)
// import {
//   useHardwareExecute,
//   useHardwareRead,
//   useHardwareBatchRead,
//   useAvailablePorts,
//   usePortInfo,
//   useActionInfo,
//   // 🆕 DDC 시스템 관련 훅들 추가
//   // useSaveDDCConfig 삭제됨 (ddc-config 엔드포인트 삭제)
//   useGetDDCStatus,
//   useGetDDCTime,
//   useSetDDCTime,
//   useGetSeasonMode,
//   useSetSeasonMode,
//   // 🆕 HVAC 및 Heat Exchanger 관련 훅들 추가
//   useGetBatchHVACStatus,
//   useGetBatchSensorData,
//   useGetBatchHeatExchangerStatus,
//   useSetHVACMode,
//   useSetHVACSpeed,
//   useSetHVACStartSchedule,
//   useSetHVACEndSchedule,
//   useSetHeatExchangerMode,
//   useSetHeatExchangerPower,
//   useSetHeatExchangerSpeed,
//   useSetHeatExchangerStartSchedule,
//   useSetHeatExchangerEndSchedule,
//   // 🆕 DO/DI 포트 관련 훅들 추가
//   useSetDOMode,
//   useSetDOManual,
//   useGetDOStatus,
//   useGetBatchDOMode,
//   useGetBatchDOStatus,
//   useSetDIEnable,
//   useGetDIStatus,
//   useGetBatchDIStatus,
//   // 🆕 스케줄 관련 훅들 추가
//   useSetSchedule,
// } from '../api/queries/hardware';

// 🆕 새로운 하드웨어 직접 제어 훅 import
import { useSendDirectHardwareCommand, useReadHardwareStatus, useReadAllHardwareStatus } from '../api/queries/hardware';
import { useClientOverview } from '../hooks/useClientOverview';

import { useClientCatalog } from './useClientCatalog';
import { usePollingStatus } from './usePollingStatus';

// useLogs 훅의 options 타입을 명확히 정의
interface UseLogsOptions {
  logType?: string;
  deviceId?: string;
  unitId?: string;
  limit?: number;
  skip?: number;
  enabled?: boolean;
}

/**
 * 모든 API 쿼리 및 뮤테이션 훅을 구조화하여 제공합니다.
 * 이 훅은 직접적으로 데이터를 페치하지 않으며,
 * 하위 객체를 통해 실제 데이터 훅을 호출할 수 있는 인터페이스를 제공합니다.
 */
export const useApi = () => {
  return {
    client: {
      info: useGetClient,
      status: useGetClientStatus,
      data: useGetClientData,
      errors: useGetClientErrors,
      overview: useClientOverview,
      catalog: useClientCatalog,
      list: useGetClients,
      select: useSelectClient,
    },
    device: {
      list: useGetDevices,
      register: useRegisterDevice,
    },
    system: {
      // 기존 시스템 API
      apiKeys: useGetApiKeys,
      createApiKey: useCreateApiKey,
      deleteApiKey: useDeleteApiKey,
      // 새로운 시스템 API
      settings: useGetSystemSettings,
      getPollingStatus: usePollingStatus,
      ntp: {
        status: useGetNtpStatus,
        setServer: useSetNtpServer,
      },
      network: {
        setDhcp: useSetNetworkDhcp,
        setStatic: useSetNetworkStatic,
      },
      softap: {
        status: useGetSoftapStatus,
        set: useSetSoftap,
      },
    },
    // logs 훅에 명시적인 타입을 지정합니다.
    logs: useGetLogs,
    logFiles: useGetLogFiles,
    logContent: useGetLogContent,
    searchLogs: useSearchLogs,
    logStats: useGetLogStats,

    auth: {
      login: useLogin,
      logout: useLogout,
      changePassword: useChangePassword,
    },
    // 🆕 SNGIL DDC API - hardware.ts로 대체됨 (legacy 호환성 유지) - 임시로 주석 처리
    // sngilDDC: {
    //   // 🆕 기본 DDC 관련 훅들만 유지 (hardware.ts에서 가져옴)
    //   getDDCStatus: useGetDDCStatus,
    //   getDDCTime: useGetDDCTime,
    //   setDDCTime: useSetDDCTime,
    //   getDDCPollingInterval: useGetPollingInterval,
    //   setDDCPollingInterval: useSetPollingInterval,
    //   // 🆕 DO/DI 관련 훅들 (hardware.ts에서 가져옴)
    //   setDOMode: useSetDOMode,
    //   setDOManual: useSetDOManual,
    //   getDOStatus: useGetDOStatus,
    //   setDOSchedule: useSetSchedule,
    //   getBatchDOMode: useGetBatchDOMode,
    //   getBatchDOStatus: useGetBatchDOStatus,
    //   setDIEnable: useSetDIEnable,
    //   getDIStatus: useGetDIStatus,
    //   getBatchDIStatus: useGetBatchDIStatus,
    //   // 🆕 HVAC 관련 훅들 (hardware.ts에서 가져옴)
    //   setHVACMode: useSetHVACMode,
    //   setHVACSpeed: useSetHVACSpeed,
    //   setHVACStartSchedule: useSetHVACStartSchedule,
    //   setHVACEndSchedule: useSetHVACEndSchedule,
    //   getBatchHVACStatus: useGetBatchHVACStatus,
    //   getBatchSensorData: useGetBatchSensorData,
    //   // 🆕 Heat Exchanger 관련 훅들 (hardware.ts에서 가져옴)
    //   setHeatExchangerMode: useSetHeatExchangerMode,
    //   setHeatExchangerPower: useSetHeatExchangerPower,
    //   setHeatExchangerSpeed: useSetHeatExchangerSpeed,
    //   setHeatExchangerStartSchedule: useSetHeatExchangerStartSchedule,
    //   setHeatExchangerEndSchedule: useSetHeatExchangerEndSchedule,
    //   getBatchHeatExchangerStatus: useGetBatchHeatExchangerStatus,
    // },

    // 🆕 새로운 하드웨어 제어 훅들 추가 - 임시로 주석 처리
    // hardware: {
    //   execute: useHardwareExecute,
    //   read: useHardwareRead,
    //   batchRead: useHardwareBatchRead,
    //   availablePorts: useAvailablePorts,
    //   portInfo: usePortInfo,
    //   actionInfo: useActionInfo,
    //   // 🆕 DDC 시스템 관련 훅들
    //   ddc: {
    //     // getConfig 삭제됨 (ddc-config 엔드포인트 삭제)
    //     getStatus: useGetDDCStatus,
    //     getTime: useGetDDCTime,
    //     setTime: useSetDDCTime,
    //     getPollingInterval: useGetPollingInterval,
    //     setPollingInterval: useSetPollingInterval,
    //   },
    //   // 🆕 HVAC 및 Heat Exchanger 관련 훅들
    //   hvac: {
    //     getBatchStatus: useGetBatchHVACStatus,
    //     getBatchSensorData: useGetBatchSensorData,
    //     getBatchHeatExchangerStatus: useGetBatchHeatExchangerStatus,
    //     setMode: useSetHVACMode,
    //     setSpeed: useSetHVACSpeed,
    //     setStartSchedule: useSetHVACStartSchedule,
    //     setEndSchedule: useSetHVACEndSchedule,
    //   },
    //   exchanger: {
    //     setMode: useSetHeatExchangerMode,
    //     setPower: useSetHeatExchangerPower,
    //     setSpeed: useSetHeatExchangerSpeed,
    //     setStartSchedule: useSetHeatExchangerStartSchedule,
    //     setEndSchedule: useSetHeatExchangerEndSchedule,
    //   },
    //   // 🆕 DO/DI 포트 관련 훅들
    //   do: {
    //     setMode: useSetDOMode,
    //     setManual: useSetDOManual,
    //     getStatus: useGetDOStatus,
    //     getBatchMode: useGetBatchDOMode,
    //     getBatchStatus: useGetBatchDOStatus,
    //   },
    //   di: {
    //     setEnable: useSetDIEnable,
    //     getStatus: useGetDIStatus,
    //     getBatchStatus: useGetBatchDIStatus,
    //   },
    //   // 🆕 스케줄 관련 훅들
    //   schedule: {
    //     set: useSetSchedule,
    //   },
    //   // 🆕 계절 모드 관련 훅들
    //   season: {
    //     getMode: useGetSeasonMode,
    //     setMode: useSetSeasonMode,
    //   },
    // },

    // 🆕 새로운 하드웨어 직접 제어 훅 추가
    hardware: {
      sendDirectCommand: useSendDirectHardwareCommand,
      readStatus: useReadHardwareStatus,
      readAllStatus: useReadAllHardwareStatus,
    },
  };
};

// 개별 훅들도 필요에 따라 직접 임포트하여 사용할 수 있도록 명시적으로 export
export {
  useGetClient,
  useGetClientStatus,
  useGetClientData,
  useGetClientErrors,
  useGetClients,
  useGetDevices,
  useRegisterDevice,
  useGetApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useGetLogs,
  useGetLogFiles,
  useGetLogContent,
  useSearchLogs,
  useGetLogStats,
  useLogin,
  useLogout,
  useChangePassword,
  // 새로운 시스템 API 훅들
  useGetSystemSettings,
  useGetNtpStatus,
  useSetNtpServer,
  useSetNetworkDhcp,
  useSetNetworkStatic,
  useGetSoftapStatus,
  useSetSoftap,
};
