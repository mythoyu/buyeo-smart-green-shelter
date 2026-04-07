import { ServiceContainer } from '../core/container/ServiceContainer';
import { logDebug, logInfo } from '../logger';
import { ApiKey } from '../models/schemas/ApiKeySchema';
import { User } from '../models/schemas/UserSchema';

/**
 * 데이터베이스 상태를 확인합니다.
 */
export async function checkDatabaseStatus(): Promise<void> {
  try {
    logInfo('데이터베이스 상태 확인 시작');

    // 모든 사용자 조회
    const users = await User.find({}).lean();
    const apiKeys = await ApiKey.find({}).lean();

    logInfo(`데이터베이스 상태 - 사용자: ${users.length}명, API 키: ${apiKeys.length}개`);

    // 사용자 상세 정보
    for (const user of users) {
      logDebug(`사용자: ${user.username} (${user.role}) - ID: ${user._id}`);
    }

    // API 키 상세 정보
    for (const apiKey of apiKeys) {
      logDebug(`API 키: ${apiKey.username} (${apiKey.type}) - userId: ${apiKey.userId || '없음'}`);
    }

    logInfo('데이터베이스 상태 확인 완료');
  } catch (error) {
    logInfo('데이터베이스 상태 확인 중 오류 발생');
    throw error;
  }
}

/**
 * 기존 사용자와 API 키를 연결합니다.
 */
export async function linkUsersAndApiKeys(): Promise<void> {
  try {
    logDebug('사용자와 API 키 연결 시작');

    // 모든 사용자 조회
    const users = await User.find({}).lean();
    const apiKeys = await ApiKey.find({}).lean();

    logDebug(`사용자 ${users.length}명, API 키 ${apiKeys.length}개 발견`);

    // 사용자명으로 API 키 매칭
    for (const user of users) {
      const matchingApiKey = apiKeys.find((key) => key.username === user.username);
      if (matchingApiKey && !matchingApiKey.userId) {
        await ApiKey.updateOne({ _id: matchingApiKey._id }, { $set: { userId: user._id } });
        logDebug(`API 키 연결: ${user.username} -> ${matchingApiKey.username}`);
      }
    }

    logDebug('사용자와 API 키 연결 완료');
  } catch (error) {
    logInfo('사용자와 API 키 연결 중 오류 발생');
    throw error;
  }
}

export async function seedUsers(): Promise<void> {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const userConfigService = serviceContainer.getUserConfigService();
    const config = userConfigService.loadConfig();
    const { users = [] } = config;

    // 1. 모든 사용자 등록 (통합 처리)
    const createdUsers = new Map<string, any>();
    for (const userConfig of users) {
      const exists = await User.findOne({ username: userConfig.username });
      let user;

      if (!exists) {
        logInfo(`새 사용자 생성 시작: ${userConfig.username} (Mongoose 미들웨어가 비밀번호 해시화 예정)`);

        user = await User.create({
          username: userConfig.username,
          password: userConfig.password, // 평문 비밀번호 저장 (Mongoose 미들웨어가 해시화)
          role: userConfig.role,
          companyId: userConfig.companyId,
          description: userConfig.description,
        });
        createdUsers.set(userConfig.username, user);
        logInfo(`User(${userConfig.username}) 생성 완료 - 비밀번호 해시화됨`);
      } else {
        // 기존 사용자의 비밀번호가 해시화되어 있는지 확인
        const isAlreadyHashed = exists.password.startsWith('$2a$') || exists.password.startsWith('$2b$');

        if (!isAlreadyHashed) {
          logInfo(
            `기존 사용자 비밀번호 업데이트 시작: ${userConfig.username} (Mongoose 미들웨어가 비밀번호 해시화 예정)`,
          );

          // 평문 비밀번호로 업데이트 (Mongoose 미들웨어가 해시화)
          await User.updateOne({ _id: exists._id }, { $set: { password: userConfig.password } });
          logInfo(`기존 사용자 비밀번호 업데이트 완료: ${userConfig.username} - 비밀번호 해시화됨`);
        } else {
          logDebug(`기존 사용자 비밀번호 이미 해시화됨: ${userConfig.username}`);
        }
        user = exists;
        createdUsers.set(userConfig.username, user);
      }

      // 2. 사용자별 API 키 등록 (Repository를 통해 자동 생성 형식 사용)
      if (userConfig.apiKey) {
        const apiKeyService = serviceContainer.getApiKeyService();
        const existsKey = await ApiKey.findOne({ username: userConfig.apiKey.name });
        if (!existsKey) {
          // Repository를 통해 생성 (users.json의 고정 키 값 사용)
          await apiKeyService.createApiKey({
            username: userConfig.apiKey.name,
            key: userConfig.apiKey.key, // users.json에 정의된 고정 키 값 사용
            type: userConfig.apiKey.type,
            permissions: userConfig.apiKey.permissions,
            userId: (user._id as any).toString(), // 사용자와 연결
          });
          logInfo(`ApiKey(${userConfig.apiKey.name}) 생성 - User(${userConfig.username}) 연결`);
        }
      }
    }

    // 3. 기존 사용자와 API 키 연결
    await linkUsersAndApiKeys();

    logInfo('users.json 기반 seed 완료');
  } catch (error) {
    logInfo('사용자/키 초기화 중 오류 발생');
    throw error;
  }
}
