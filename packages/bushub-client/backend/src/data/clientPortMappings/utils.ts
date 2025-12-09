import { CLIENT_PORT_MAPPINGS } from './index';

// 포트 사용 현황 검증 함수
export const validatePortUsage = (clientId: string): void => {
  const usedPorts = new Map<string, { deviceType: string; unitId: string; commandKey: string }>();
  const clientMapping = (CLIENT_PORT_MAPPINGS as Record<string, any>)[clientId];

  if (!clientMapping) {
    throw new Error(`Client '${clientId}' not found in port mappings`);
  }

  Object.entries(clientMapping as Record<string, Record<string, any>>).forEach(([deviceType, deviceMapping]) => {
    Object.entries(deviceMapping as Record<string, any>).forEach(([unitId, unitMapping]) => {
      Object.entries(unitMapping as Record<string, any>).forEach(([commandKey, hardwarePort]: [string, any]) => {
        const portKey = `${hardwarePort.address}`;

        if (usedPorts.has(portKey)) {
          const conflict = usedPorts.get(portKey)!;
          throw new Error(
            `Port conflict: Address ${portKey} is used by both ` +
              `${conflict.deviceType}-${conflict.unitId} (${conflict.commandKey}) and ` +
              `${deviceType}-${unitId} (${commandKey})`,
          );
        }

        usedPorts.set(portKey, { deviceType, unitId, commandKey });
      });
    });
  });

  console.log(`✅ Port validation passed for client '${clientId}'. Total ports used: ${usedPorts.size}`);
};

// 고급 포트 검증 시스템
export class AdvancedPortValidator {
  private static instance: AdvancedPortValidator;
  private validationCache = new Map<string, boolean>();
  private conflictHistory: Array<{
    timestamp: Date;
    clientId: string;
    conflict: string;
    resolution: string;
  }> = [];

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): AdvancedPortValidator {
    if (!AdvancedPortValidator.instance) {
      AdvancedPortValidator.instance = new AdvancedPortValidator();
    }
    return AdvancedPortValidator.instance;
  }

  /**
   * 전체 시스템 포트 충돌 검증
   */
  validateSystemWidePorts(): {
    isValid: boolean;
    conflicts: string[];
    summary: string;
  } {
    const allUsedPorts = new Map<
      string,
      Array<{
        clientId: string;
        deviceType: string;
        unitId: string;
        commandKey: string;
      }>
    >();
    const conflicts: string[] = [];

    // 모든 클라이언트의 포트 사용 현황 수집
    Object.entries(CLIENT_PORT_MAPPINGS as Record<string, any>).forEach(([clientId, clientMapping]) => {
      Object.entries(clientMapping as Record<string, any>).forEach(([deviceType, deviceMapping]) => {
        Object.entries(deviceMapping as Record<string, any>).forEach(([unitId, unitMapping]) => {
          Object.entries(unitMapping as Record<string, any>).forEach(([commandKey, hardwarePort]: [string, any]) => {
            let portAddress: number;

            if (hardwarePort === 'TIME_INTEGRATED') {
              return; // TIME_INTEGRATED는 건너뛰기
            }

            if (hardwarePort.port && hardwarePort.port.address) {
              // 새로운 구조: { port: { address } }
              portAddress = hardwarePort.port.address;
            } else if (hardwarePort.address) {
              // 하위 호환성: { address }
              portAddress = hardwarePort.address;
            } else {
              return; // 유효하지 않은 매핑
            }

            const portKey = `${portAddress}`;

            if (!allUsedPorts.has(portKey)) {
              allUsedPorts.set(portKey, []);
            }

            allUsedPorts.get(portKey)!.push({ clientId, deviceType, unitId, commandKey });
          });
        });
      });
    });

    // 충돌 검출
    allUsedPorts.forEach((users, portKey) => {
      if (users.length > 1) {
        const conflictDetails = users
          .map((u) => `${u.clientId}-${u.deviceType}-${u.unitId} (${u.commandKey})`)
          .join(' vs ');
        conflicts.push(`Port ${portKey}: ${conflictDetails}`);
      }
    });

    const isValid = conflicts.length === 0;
    const summary = isValid
      ? `✅ System-wide port validation passed. Total unique ports: ${allUsedPorts.size}`
      : `❌ System-wide port validation failed. Found ${conflicts.length} conflicts`;

    return { isValid, conflicts, summary };
  }

  /**
   * 특정 포트의 사용 현황 조회
   */
  getPortUsage(portAddress: number): Array<{
    clientId: string;
    deviceType: string;
    unitId: string;
    commandKey: string;
  }> {
    const users: Array<{
      clientId: string;
      deviceType: string;
      unitId: string;
      commandKey: string;
    }> = [];

    Object.entries(CLIENT_PORT_MAPPINGS as Record<string, any>).forEach(([clientId, clientMapping]) => {
      Object.entries(clientMapping as Record<string, any>).forEach(([deviceType, deviceMapping]) => {
        Object.entries(deviceMapping as Record<string, any>).forEach(([unitId, unitMapping]) => {
          Object.entries(unitMapping as Record<string, any>).forEach(([commandKey, hardwarePort]: [string, any]) => {
            if (hardwarePort === 'TIME_INTEGRATED') {
              return; // TIME_INTEGRATED는 건너뛰기
            }

            let currentPortAddress: number;

            if (hardwarePort.port && hardwarePort.port.address) {
              // 새로운 구조: { port: { address } }
              currentPortAddress = hardwarePort.port.address;
            } else if (hardwarePort.address) {
              // 하위 호환성: { address }
              currentPortAddress = hardwarePort.address;
            } else {
              return; // 유효하지 않은 매핑
            }

            if (currentPortAddress === portAddress) {
              users.push({ clientId, deviceType, unitId, commandKey });
            }
          });
        });
      });
    });

    return users;
  }

  /**
   * 포트 충돌 해결 제안
   */
  suggestPortResolution(conflict: string): string[] {
    const suggestions: string[] = [];

    if (conflict.includes('DO')) {
      suggestions.push('DO 포트 충돌: 다음 사용 가능한 DO 포트로 변경 고려');
      suggestions.push('DI 포트 활용: 일부 제어 기능을 DI 포트로 이동 고려');
    } else if (conflict.includes('DI')) {
      suggestions.push('DI 포트 충돌: 다음 사용 가능한 DI 포트로 변경 고려');
      suggestions.push('DO 포트 활용: 일부 제어 기능을 DO 포트로 이동 고려');
    }

    suggestions.push('포트 범위 확장: DO17~DO32, DI17~DI32 추가 고려');
    suggestions.push('클라이언트별 포트 그룹 분리: c0101: DO1~8, c0102: DO9~16 등');

    return suggestions;
  }

  /**
   * 검증 이력 조회
   */
  getValidationHistory(): Array<{
    timestamp: Date;
    clientId: string;
    conflict: string;
    resolution: string;
  }> {
    return [...this.conflictHistory];
  }

  /**
   * 검증 캐시 초기화
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    console.log('🔄 Port validation cache cleared');
  }
}

// 전역 포트 검증기 인스턴스
export const portValidator = AdvancedPortValidator.getInstance();
