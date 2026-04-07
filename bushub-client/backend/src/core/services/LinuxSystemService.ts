import { ILogger } from '../../shared/interfaces/ILogger';
import { ILinuxSystemService, NetworkSettings, NtpSettings, SoftapSettings } from './interfaces/ILinuxSystemService';
import { ISecurityService } from './interfaces/ISecurityService';

/**
 * LinuxSystemService
 *
 * 네트워크 관련 기능들이 Network Control API로 이관되어
 * 이 서비스는 더 이상 네트워크 제어 기능을 제공하지 않습니다.
 *
 * 기존 코드와의 호환성을 위해 빈 구현체로 유지합니다.
 */
export class LinuxSystemService implements ILinuxSystemService {
  private logger: ILogger | undefined;
  private securityService: ISecurityService | undefined;

  constructor(logger?: ILogger, securityService?: ISecurityService) {
    this.logger = logger;
    this.securityService = securityService;

    this.logger?.info('LinuxSystemService 초기화됨 (네트워크 기능은 Network Control API로 이관됨)');
  }

  // 모든 네트워크 관련 메서드들이 Network Control API로 이관됨
  // 기존 코드 호환성을 위한 더미 메서드들
  async getCurrentNetworkSettings(): Promise<NetworkSettings> {
    this.logger?.warn('getCurrentNetworkSettings 호출됨 - Network Control API를 사용하세요');
    return {
      interface: 'eth0',
      ip: '192.168.1.100',
      netmask: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: ['8.8.8.8', '8.8.4.4'],
    };
  }

  async getCurrentNtpSettings(): Promise<NtpSettings> {
    this.logger?.warn('getCurrentNtpSettings 호출됨 - Network Control API를 사용하세요');
    return {
      enabled: true,
      servers: ['pool.ntp.org', 'time.nist.gov'],
    };
  }

  async getDefaultSoftapSettings(): Promise<SoftapSettings> {
    this.logger?.warn('getDefaultSoftapSettings 호출됨 - Network Control API를 사용하세요');
    return {
      enabled: false,
      ssid: 'SmartCity-AP',
      password: 'smartcity123',
      channel: 6,
    };
  }
}
