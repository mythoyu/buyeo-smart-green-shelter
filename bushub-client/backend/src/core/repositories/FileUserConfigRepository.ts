import fs from 'fs';
import path from 'path';

import { logInfo } from '../../logger';

import {
  IUserConfigRepository,
  ConfigFile,
  UserConfig,
  ApiKeyConfig,
  UserSettings,
} from './interfaces/IUserConfigRepository';

export class FileUserConfigRepository implements IUserConfigRepository {
  private configPath: string;
  private config: ConfigFile | null = null;

  constructor(configPath?: string) {
    // 환경변수로 경로 설정 가능
    const envPath = process.env.USERS_CONFIG_PATH;
    const defaultPath = envPath || path.join(__dirname, '../../config/users.json');
    this.configPath = configPath || defaultPath;
  }

  loadConfig(): ConfigFile {
    if (this.config) {
      return this.config;
    }

    try {
      // 클라우드 환경에서는 로거 사용 안함
      if (process.env.NODE_ENV !== 'production') {
        logInfo(`[DEBUG] Config file path: ${this.configPath}`);
        logInfo(`[DEBUG] Current directory: ${process.cwd()}`);
        logInfo(`[DEBUG] __dirname: ${__dirname}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);

      if (process.env.NODE_ENV !== 'production') {
        logInfo(`[DEBUG] Config loaded successfully`);
      }

      return this.config!;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[DEBUG] Config load error: ${error}`);
      }
      throw new Error(
        `사용자 설정 파일을 로드할 수 없습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  reloadConfig(): ConfigFile {
    this.config = null;
    return this.loadConfig();
  }

  getUserConfig(username: string): UserConfig | null {
    const config = this.loadConfig();

    // 통합된 사용자에서 찾기
    const user = config.users.find((u) => u.username === username);
    if (user) return user;

    return null;
  }

  getApiKeyConfig(name: string): ApiKeyConfig | null {
    const config = this.loadConfig();

    // 사용자별 API 키에서 찾기
    for (const user of config.users) {
      if (user.apiKey && user.apiKey.name === name) {
        return user.apiKey;
      }
    }

    return null;
  }

  getSettings(): UserSettings {
    const config = this.loadConfig();
    return config.settings;
  }

  saveConfig(config: ConfigFile): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this.config = config;
    } catch (error) {
      throw new Error(`설정 파일을 저장할 수 없습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
