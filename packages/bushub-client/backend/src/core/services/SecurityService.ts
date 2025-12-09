import { ILogger } from '../../shared/interfaces/ILogger';

import { ISecurityService } from './interfaces/ISecurityService';

export class SecurityService implements ISecurityService {
  private logger: ILogger | undefined;

  // 🔒 허용된 명령어 화이트리스트
  private readonly ALLOWED_COMMANDS = [
    // NetworkManager 명령어
    'nmcli',
    'timedatectl',
    'systemctl',

    // 파일 시스템 명령어 (제한적)
    'cp',
    'rm',
    'mv',

    // 시스템 정보 조회
    'cat',
    'ls',
    'grep',

    // sudo -S 패턴용 명령어
    'echo',
  ];

  // 🔒 허용된 파일 경로 패턴
  private readonly ALLOWED_PATH_PATTERNS = [
    /^\/etc\/netplan\/.+\.yaml$/,
    /^\/etc\/systemd\/timesyncd\.conf$/,
    /^\/tmp\/system_config_\d+\.tmp$/,
  ];

  // 🔒 금지된 문자열 패턴
  private readonly FORBIDDEN_PATTERNS = [
    /[;&`$(){}[\]\\]/, // 명령어 인젝션 방지
    /\.\./, // 디렉토리 트래버설 방지
    /^-/, // 옵션 인젝션 방지
  ];

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  // 🔒 명령어 검증
  validateCommand(command: string): boolean {
    try {
      this.logger?.info(`🔒 명령어 검증: ${command}`);

      // 빈 명령어 거부
      if (!command || command.trim().length === 0) {
        this.logger?.warn(`❌ 빈 명령어 거부`);
        return false;
      }

      // 명령어에서 첫 번째 단어 추출 (실제 명령어)
      const baseCommand = command.trim().split(' ')[0];

      // sudo 제거
      const actualCommand = baseCommand === 'sudo' ? command.trim().split(' ')[1] : baseCommand;

      // 화이트리스트 확인
      if (!this.ALLOWED_COMMANDS.includes(actualCommand)) {
        this.logger?.warn(`❌ 허용되지 않은 명령어: ${actualCommand}`);
        return false;
      }

      // || true 패턴 특별 허용 (안전한 에러 무시 패턴)
      if (command.includes('|| true')) {
        this.logger?.info(`✅ || true 패턴 허용: ${command}`);
      }
      // sudo -S 패턴 특별 허용 (비밀번호 자동 입력 패턴)
      else if (command.includes("echo '") && command.includes("' | sudo -S ")) {
        this.logger?.info(`✅ sudo -S 패턴 허용: ${command}`);
      } else {
        // 금지된 패턴 확인
        for (const pattern of this.FORBIDDEN_PATTERNS) {
          if (pattern.test(command)) {
            this.logger?.warn(`❌ 금지된 패턴 발견: ${command}`);
            return false;
          }
        }
      }

      this.logger?.info(`✅ 명령어 검증 통과: ${command}`);
      return true;
    } catch (error) {
      this.logger?.error(`❌ 명령어 검증 오류: ${error}`);
      return false;
    }
  }

  // 🔒 파일 경로 검증
  validateFilePath(path: string): boolean {
    try {
      this.logger?.info(`🔒 파일 경로 검증: ${path}`);

      // 빈 경로 거부
      if (!path || path.trim().length === 0) {
        this.logger?.warn(`❌ 빈 파일 경로 거부`);
        return false;
      }

      // 허용된 경로 패턴 확인
      const isAllowed = this.ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(path));

      if (!isAllowed) {
        this.logger?.warn(`❌ 허용되지 않은 파일 경로: ${path}`);
        return false;
      }

      // 금지된 패턴 확인
      for (const pattern of this.FORBIDDEN_PATTERNS) {
        if (pattern.test(path)) {
          this.logger?.warn(`❌ 금지된 패턴 발견 (파일 경로): ${path}`);
          return false;
        }
      }

      this.logger?.info(`✅ 파일 경로 검증 통과: ${path}`);
      return true;
    } catch (error) {
      this.logger?.error(`❌ 파일 경로 검증 오류: ${error}`);
      return false;
    }
  }

  // 🔒 네트워크 설정 검증
  validateNetworkSettings(settings: any): boolean {
    try {
      this.logger?.info(`🔒 네트워크 설정 검증`);

      if (!settings || typeof settings !== 'object') {
        this.logger?.warn(`❌ 잘못된 네트워크 설정 형식`);
        return false;
      }

      const { interface: iface, dhcp4, addresses, gateway, nameservers } = settings;

      // 인터페이스 이름 검증 (영숫자, 하이픈, 언더스코어만 허용)
      if (!iface || !/^[a-zA-Z0-9_-]+$/.test(iface)) {
        this.logger?.warn(`❌ 잘못된 인터페이스 이름: ${iface}`);
        return false;
      }

      // DHCP가 아닌 경우 IP 주소 검증
      if (!dhcp4) {
        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
          this.logger?.warn(`❌ 고정 IP 설정에 주소가 필요합니다`);
          return false;
        }

        // IP 주소 형식 검증
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
        if (!addresses.every((addr) => ipPattern.test(addr))) {
          this.logger?.warn(`❌ 잘못된 IP 주소 형식`);
          return false;
        }

        // 게이트웨이 검증
        const gatewayPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (gateway && !gatewayPattern.test(gateway)) {
          this.logger?.warn(`❌ 잘못된 게이트웨이 형식: ${gateway}`);
          return false;
        }
      }

      this.logger?.info(`✅ 네트워크 설정 검증 통과`);
      return true;
    } catch (error) {
      this.logger?.error(`❌ 네트워크 설정 검증 오류: ${error}`);
      return false;
    }
  }

  // 🔒 NTP 설정 검증
  validateNtpSettings(settings: any): boolean {
    try {
      this.logger?.info(`🔒 NTP 설정 검증`);

      if (!settings || typeof settings !== 'object') {
        this.logger?.warn(`❌ 잘못된 NTP 설정 형식`);
        return false;
      }

      const { enabled, primaryServer, fallbackServer, timezone } = settings;

      // 활성화 상태 검증
      if (typeof enabled !== 'boolean') {
        this.logger?.warn(`❌ NTP 활성화 상태가 boolean이 아닙니다`);
        return false;
      }

      if (enabled) {
        // 서버 이름 검증 (도메인 또는 IP)
        const serverPattern = /^[a-zA-Z0-9.-]+$/;
        if (!primaryServer || !serverPattern.test(primaryServer)) {
          this.logger?.warn(`❌ 잘못된 NTP 서버 형식: ${primaryServer}`);
          return false;
        }

        // 폴백 서버 검증 (선택적)
        if (fallbackServer && fallbackServer.trim()) {
          if (!serverPattern.test(fallbackServer.trim())) {
            this.logger?.warn(`❌ 잘못된 폴백 NTP 서버 형식: ${fallbackServer}`);
            return false;
          }
        }

        // 타임존 검증 (Asia/Seoul 형식 또는 UTC)
        const timezonePattern = /^([A-Za-z_]+\/[A-Za-z_]+|UTC)$/;
        if (!timezone || !timezonePattern.test(timezone)) {
          this.logger?.warn(`❌ 잘못된 타임존 형식: ${timezone}`);
          return false;
        }
      }

      this.logger?.info(`✅ NTP 설정 검증 통과`);
      return true;
    } catch (error) {
      this.logger?.error(`❌ NTP 설정 검증 오류: ${error}`);
      return false;
    }
  }

  // 🔒 SoftAP 설정 검증
  validateSoftapSettings(settings: any): boolean {
    try {
      this.logger?.info(`🔒 SoftAP 설정 검증`);

      if (!settings || typeof settings !== 'object') {
        this.logger?.warn(`❌ 잘못된 SoftAP 설정 형식`);
        return false;
      }

      const { enabled, interface: iface, ssid, password, connectionName } = settings;

      // 활성화 상태 검증
      if (typeof enabled !== 'boolean') {
        this.logger?.warn(`❌ SoftAP 활성화 상태가 boolean이 아닙니다`);
        return false;
      }

      if (enabled) {
        // 인터페이스 이름 검증
        if (!iface || !/^[a-zA-Z0-9_-]+$/.test(iface)) {
          this.logger?.warn(`❌ 잘못된 WiFi 인터페이스 이름: ${iface}`);
          return false;
        }

        // SSID 검증 (1-32자, 특수문자 제한)
        if (!ssid || ssid.length < 1 || ssid.length > 32) {
          this.logger?.warn(`❌ SSID 길이가 잘못됨: ${ssid?.length}`);
          return false;
        }

        // 패스워드 검증 (8-63자)
        if (!password || password.length < 8 || password.length > 63) {
          this.logger?.warn(`❌ 패스워드 길이가 잘못됨: ${password?.length}`);
          return false;
        }

        // 연결 이름 검증 (빈 문자열은 허용 - 자동 생성됨)
        if (connectionName && connectionName.trim() !== '' && !/^[a-zA-Z0-9_-]+$/.test(connectionName)) {
          this.logger?.warn(`❌ 잘못된 연결 이름: ${connectionName}`);
          return false;
        }
      }

      this.logger?.info(`✅ SoftAP 설정 검증 통과`);
      return true;
    } catch (error) {
      this.logger?.error(`❌ SoftAP 설정 검증 오류: ${error}`);
      return false;
    }
  }

  // 🔒 입력값 살균 (sanitization)
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // 기본적인 HTML/스크립트 태그 제거
    const sanitized = input
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/[;&|`$(){}[\]\\]/g, '') // 위험한 특수문자 제거
      .trim();

    this.logger?.info(`🔒 입력값 살균: "${input}" → "${sanitized}"`);
    return sanitized;
  }

  // 🔒 시스템 권한 확인
  async checkSystemPermissions(): Promise<boolean> {
    try {
      this.logger?.info(`🔒 시스템 권한 확인`);

      // 현재 사용자가 sudo 권한을 가지고 있는지 확인
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        await execAsync('sudo -n true');
        this.logger?.info(`✅ sudo 권한 확인됨`);
        return true;
      } catch (error) {
        this.logger?.warn(`❌ sudo 권한 없음: ${error}`);
        return false;
      }
    } catch (error) {
      this.logger?.error(`❌ 권한 확인 오류: ${error}`);
      return false;
    }
  }
}
