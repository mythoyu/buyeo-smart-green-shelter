import { useMemo } from 'react';

import { deviceSpecs } from '../meta/smartcityDeviceSpecs';
import { smartcityMetaHelpers, getDeviceTypeIcon } from '../meta/smartcityMetaHelpers';

/**
 * 모든 디바이스의 정적 메타데이터(스펙, 스타일)를 반환하는 훅
 * 필터 옵션과 UI 표시용 메타데이터를 제공합니다.
 */
export function useClientCatalog() {
  // deviceSpecs와 deviceStyles를 분리하여 반환
  const { specs, styles } = useMemo(() => {
    const specs: Record<string, any> = {};
    const styles: Record<string, any> = {};

    deviceSpecs.forEach((spec: any) => {
      const style = smartcityMetaHelpers.getDeviceStyle(spec.deviceId);
      specs[spec.deviceType] = spec;
      styles[spec.deviceType] = style;
    });

    return { specs, styles };
  }, []);

  // 디바이스 타입 옵션 생성
  const deviceTypeOptions = useMemo(() => {
    return Object.keys(specs).map(deviceType => {
      const spec = specs[deviceType];
      const style = styles[deviceType];

      return {
        type: deviceType,
        label: spec.deviceName || deviceType,
        icon: getDeviceTypeIcon(deviceType),
        color: style.color || '#666',
        bgColor: style.bgColor || '#f5f5f5',
      };
    });
  }, [specs, styles]);

  return {
    deviceSpecs: specs,
    deviceStyles: styles,
    deviceTypeOptions,
  };
}
