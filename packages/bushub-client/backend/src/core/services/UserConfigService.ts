import { ApiKey as ApiKeySchema } from '../../models/schemas/ApiKeySchema';
import { User as UserSchema } from '../../models/schemas/UserSchema';
import { ILogger } from '../../shared/interfaces/ILogger';
import {
  IUserConfigRepository,
  UserConfig,
  ApiKeyConfig,
  UserSettings,
  ConfigFile,
} from '../repositories/interfaces/IUserConfigRepository';

import { IUserConfigService } from './interfaces/IUserConfigService';
import { IWebSocketService } from './interfaces/IWebSocketService';

export class UserConfigService implements IUserConfigService {
  constructor(
    private userConfigRepository: IUserConfigRepository,
    private _webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  loadConfig(): ConfigFile {
    try {
      const config = this.userConfigRepository.loadConfig();
      this.logger?.info('✅ 사용자 설정 파일 로드 완료');
      return config;
    } catch (error) {
      this.logger?.error('❌ 사용자 설정 파일 로드 실패');
      throw error;
    }
  }

  reloadConfig(): ConfigFile {
    try {
      const config = this.userConfigRepository.reloadConfig();
      this.logger?.info('✅ 사용자 설정 파일 재로드 완료');
      return config;
    } catch (error) {
      this.logger?.error('❌ 사용자 설정 파일 재로드 실패');
      throw error;
    }
  }

  getUserConfig(username: string): UserConfig | null {
    return this.userConfigRepository.getUserConfig(username);
  }

  getApiKeyConfig(name: string): ApiKeyConfig | null {
    return this.userConfigRepository.getApiKeyConfig(name);
  }

  getExternalUsers(): any[] {
    // TODO: Implement external users logic
    return [];
  }

  getSettings(): UserSettings {
    return this.userConfigRepository.getSettings();
  }

  /**
   * 모든 사용자를 초기화합니다.
   *
   * ⚠️ 운영 환경에서는 이 함수가 자동 실행되지 않도록 주의하세요!
   *    - 개발/테스트 환경에서만 전체 초기화 권장
   *    - 운영에서는 이미 존재하는 데이터는 유지, 없는 데이터만 추가하는 방식으로 변경 필요
   */
  async initializeAllUsers(): Promise<void> {
    this.logger?.info('🔄 JSON 기반 사용자 초기화 시작...');

    const config = this.loadConfig();

    // 기존 데이터 모두 삭제
    await this.clearAllData();

    // 통합된 사용자들 초기화 (API 키 포함)
    await this.initializeUsers(config.users);

    this.logger?.info('✅ JSON 기반 사용자 초기화 완료');
  }

  /**
   * 기존 사용자와 API 키 데이터를 모두 삭제합니다.
   *
   * ⚠️ 운영 환경에서는 전체 삭제가 치명적일 수 있으니 반드시 개발/테스트 환경에서만 사용하세요!
   */
  async clearAllData(): Promise<void> {
    try {
      // 모든 사용자 삭제
      const userDeleteResult = await UserSchema.deleteMany({});
      this.logger?.info('🗑️  기존 사용자 삭제 완료');

      // 모든 API 키 삭제
      const apiKeyDeleteResult = await ApiKeySchema.deleteMany({});
      this.logger?.info('🗑️  기존 API 키 삭제 완료');

      this.logger?.info('✅ 기존 데이터 삭제 완료');
    } catch (error) {
      this.logger?.error('❌ 기존 데이터 삭제 실패');
      throw error;
    }
  }

  /**
   * 통합된 사용자들을 초기화합니다 (API 키 포함).
   */
  async initializeUsers(users: UserConfig[]): Promise<void> {
    for (const userConfig of users) {
      const exists = await UserSchema.findOne({ username: userConfig.username });
      let user;

      if (!exists) {
        // 평문 비밀번호(마스킹) 로그
        this.logger?.info('🔑 [seed] 사용자 생성');
        // bcrypt.hash 제거, 평문 비밀번호 전달
        user = await UserSchema.create({
          username: userConfig.username,
          password: userConfig.password, // 평문 전달 (pre('save')에서 해시됨)
          role: userConfig.role,
          companyId: userConfig.companyId,
        });
        this.logger?.info('✅ 기본 사용자 생성');
      } else {
        this.logger?.info('ℹ️  기본 사용자 이미 존재');
        user = exists;
      }

      // 사용자별 API 키 초기화 (사용자 객체에 포함된 경우)
      if (userConfig.apiKey) {
        const { ApiKey } = await import('../../models/schemas/ApiKeySchema');
        const existsKey = await ApiKey.findOne({ name: userConfig.apiKey.name });
        if (!existsKey) {
          await ApiKey.create({
            name: userConfig.apiKey.name,
            key: userConfig.apiKey.key,
            type: userConfig.apiKey.type,
            permissions: userConfig.apiKey.permissions,
            status: userConfig.apiKey.status,
            description: userConfig.apiKey.description,
            userId: user._id, // 사용자와 연결
          });
          this.logger?.info(`✅ API 키 생성: ${userConfig.apiKey.name}`);
        }
      }
    }
  }
}
