import {
  UserConfig,
  ApiKeyConfig,
  UserSettings,
  ConfigFile,
} from '../../repositories/interfaces/IUserConfigRepository';

export interface IUserConfigService {
  loadConfig(): ConfigFile;
  reloadConfig(): ConfigFile;
  getUserConfig(username: string): UserConfig | null;
  getApiKeyConfig(name: string): ApiKeyConfig | null;
  getSettings(): UserSettings;
  initializeAllUsers(): Promise<void>;
  clearAllData(): Promise<void>;
  initializeUsers(users: UserConfig[]): Promise<void>;
}
