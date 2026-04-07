export interface UserConfig {
  username: string;
  password: string;
  role: 'superuser' | 'user' | 'engineer' | 'ex-user';
  companyId?: string | null;
  description?: string;
  apiKey?: ApiKeyConfig;
}

export interface ApiKeyConfig {
  name: string;
  key: string;
  type: 'internal' | 'external' | 'universal';
  permissions: string[];
  status: 'active' | 'inactive';
  description?: string;
}

export interface UserSettings {
  defaultPassword: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  apiKeyPolicy: {
    keyLength: number;
    prefix: string;
    expirationDays: number;
  };
}

export interface ConfigFile {
  users: UserConfig[];
  settings: UserSettings;
}

export interface IUserConfigRepository {
  loadConfig(): ConfigFile;
  reloadConfig(): ConfigFile;
  getUserConfig(username: string): UserConfig | null;
  getApiKeyConfig(name: string): ApiKeyConfig | null;
  getSettings(): UserSettings;
  saveConfig(config: ConfigFile): void;
}
