export interface ISecurityService {
  // 🔒 명령어 검증
  validateCommand(command: string): boolean;

  // 🔒 파일 경로 검증
  validateFilePath(path: string): boolean;

  // 🔒 네트워크 설정 검증
  validateNetworkSettings(settings: any): boolean;

  // 🔒 NTP 설정 검증
  validateNtpSettings(settings: any): boolean;

  // 🔒 SoftAP 설정 검증
  validateSoftapSettings(settings: any): boolean;

  // 🔒 입력값 살균 (sanitization)
  sanitizeInput(input: string): string;

  // 🔒 권한 확인
  checkSystemPermissions(): Promise<boolean>;
}
