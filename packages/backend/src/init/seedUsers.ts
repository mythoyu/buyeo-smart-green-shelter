import bcrypt from 'bcryptjs';

import { ServiceContainer } from '../core/container/ServiceContainer';
import { Logger } from '../shared/services/Logger';
import { ApiKey } from '../models/schemas/ApiKeySchema';
import { User } from '../models/schemas/UserSchema';

const seedLog = new Logger('SeedUsers');

/**
 * 데이터베이스 상태를 확인합니다.
 */
export async function checkDatabaseStatus(): Promise<void> {
  try {
    seedLog.info('데이터베이스 상태 확인 시작');

    const users = await User.find({}).lean();
    const apiKeys = await ApiKey.find({}).lean();

    seedLog.info(`데이터베이스 상태 - 사용자: ${users.length}명, API 키: ${apiKeys.length}개`);

    for (const user of users) {
      seedLog.debug(`사용자: ${user.username} (${user.role}) - ID: ${user._id}`);
    }

    for (const apiKey of apiKeys) {
      seedLog.debug(`API 키: ${apiKey.username} (${apiKey.type}) - userId: ${apiKey.userId || '없음'}`);
    }

    seedLog.info('데이터베이스 상태 확인 완료');
  } catch (error) {
    seedLog.info('데이터베이스 상태 확인 중 오류 발생');
    throw error;
  }
}

export async function linkUsersAndApiKeys(): Promise<void> {
  try {
    seedLog.debug('사용자와 API 키 연결 시작');

    const users = await User.find({}).lean();
    const apiKeys = await ApiKey.find({}).lean();

    seedLog.debug(`사용자 ${users.length}명, API 키 ${apiKeys.length}개 발견`);

    for (const user of users) {
      const matchingApiKey = apiKeys.find((key) => key.username === user.username);
      if (matchingApiKey && !matchingApiKey.userId) {
        await ApiKey.updateOne({ _id: matchingApiKey._id }, { $set: { userId: user._id } });
        seedLog.debug(`API 키 연결: ${user.username} -> ${matchingApiKey.username}`);
      }
    }

    seedLog.debug('사용자와 API 키 연결 완료');
  } catch (error) {
    seedLog.info('사용자와 API 키 연결 중 오류 발생');
    throw error;
  }
}

export async function seedUsers(): Promise<void> {
  try {
    const serviceContainer = ServiceContainer.getInstance();
    const userConfigService = serviceContainer.getUserConfigService();
    const config = userConfigService.loadConfig();
    const { users = [] } = config;

    const createdUsers = new Map<string, any>();
    for (const userConfig of users) {
      const exists = await User.findOne({ username: userConfig.username });
      let user;

      if (!exists) {
        seedLog.info(`새 사용자 생성 시작: ${userConfig.username} (Mongoose 미들웨어가 비밀번호 해시화 예정)`);

        user = await User.create({
          username: userConfig.username,
          password: userConfig.password,
          role: userConfig.role,
          companyId: userConfig.companyId,
          description: userConfig.description,
        });
        createdUsers.set(userConfig.username, user);
        seedLog.info(`User(${userConfig.username}) 생성 완료 - 비밀번호 해시화됨`);
      } else {
        const isAlreadyHashed = exists.password.startsWith('$2a$') || exists.password.startsWith('$2b$');

        if (!isAlreadyHashed) {
          const doc = await User.findById(exists._id);
          if (doc) {
            doc.password = userConfig.password;
            await doc.save();
            seedLog.info(`기존 사용자 비밀번호 업데이트 완료: ${userConfig.username}`);
          }
        } else {
          const passwordMatches = await bcrypt.compare(userConfig.password, exists.password);
          if (!passwordMatches) {
            const doc = await User.findById(exists._id);
            if (doc) {
              doc.password = userConfig.password;
              await doc.save();
              seedLog.info(`users.json 비밀번호로 갱신: ${userConfig.username}`);
            }
          } else {
            seedLog.debug(`기존 사용자 비밀번호 일치: ${userConfig.username}`);
          }
        }
        user = (await User.findOne({ username: userConfig.username })) ?? exists;
        createdUsers.set(userConfig.username, user);
      }

      if (userConfig.apiKey) {
        const existsKey = await ApiKey.findOne({ username: userConfig.apiKey.name });
        if (!existsKey) {
          await ApiKey.create({
            username: userConfig.apiKey.name,
            key: userConfig.apiKey.key,
            type: userConfig.apiKey.type,
            permissions: userConfig.apiKey.permissions,
            status: userConfig.apiKey.status,
            description: userConfig.apiKey.description,
            userId: user._id,
          });
          seedLog.info(`ApiKey(${userConfig.apiKey.name}) 생성 - User(${userConfig.username}) 연결`);
        }
      }
    }

    await linkUsersAndApiKeys();

    seedLog.info('users.json 기반 seed 완료');
  } catch (error) {
    seedLog.info('사용자/키 초기화 중 오류 발생');
    throw error;
  }
}
