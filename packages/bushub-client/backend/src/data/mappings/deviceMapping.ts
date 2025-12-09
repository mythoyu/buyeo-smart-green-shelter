export const deviceMapping = {
  d011: 'lighting',
  d021: 'cooler',
  d022: 'exchanger',
  d031: 'aircurtain',
  d041: 'bench',
  d051: 'door',
  d061: 'integrated_sensor',
  d081: 'externalsw',
};

export const deviceMappingHelpers = {
  // 디바이스 ID로 디바이스 타입 조회
  getDeviceTypeById: (deviceId: string): string | undefined => {
    return deviceMapping[deviceId as keyof typeof deviceMapping];
  },

  // 디바이스 타입으로 디바이스 ID 조회
  getDeviceIdByType: (deviceType: string): string | undefined => {
    const entries = Object.entries(deviceMapping);
    const entry = entries.find(([_, type]) => type === deviceType);
    return entry ? entry[0] : undefined;
  },

  // 디바이스 ID로 명령어 조회
  getCommandsByDeviceId: (deviceId: string) => {
    const deviceType = deviceMapping[deviceId as keyof typeof deviceMapping];
    if (!deviceType) return undefined;

    return { deviceType, deviceId };
  },

  // 디바이스 타입으로 명령어 조회
  getCommandsByDeviceType: (deviceType: string) => {
    return { deviceType };
  },

  // 모든 디바이스 ID 반환
  getAllDeviceIds: (): string[] => {
    return Object.keys(deviceMapping);
  },

  // 모든 디바이스 타입 반환
  getAllDeviceTypes: (): string[] => {
    return Object.values(deviceMapping);
  },
};
