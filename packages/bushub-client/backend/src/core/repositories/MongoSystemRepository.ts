import { logDebug, logInfo } from '../../logger';
import { System as SystemSchema, ISystem } from '../../models/schemas/SystemSchema';

import { ISystemRepository, SystemSettings, SystemMode } from './interfaces/ISystemRepository';

export class MongoSystemRepository implements ISystemRepository {
  async findOne(): Promise<ISystem | null> {
    // logInfo('🔍 [MongoSystemRepository] findOne 호출됨');
    const result = await SystemSchema.findOne();
    if (result) {
      // logInfo(`🔍 [MongoSystemRepository] 기존 문서 발견 - ID: ${result._id}`);
      // logDebug(`🔍 [MongoSystemRepository] 기존 문서 내용: ${JSON.stringify(result.toObject(), null, 2)}`);
    } else {
      logInfo('🔍 [MongoSystemRepository] SystemSchema 기존 문서 없음 - 새로 생성 필요');
    }
    return result;
  }

  async findOneAndUpdate(filter: any, update: any, options?: any): Promise<ISystem | null> {
    return (await SystemSchema.findOneAndUpdate(filter, update, options)) as unknown as ISystem | null;
  }

  async create(data: SystemSettings): Promise<ISystem> {
    const systemDoc = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return await SystemSchema.create(systemDoc);
  }

  async updateSettings(settingsData: Partial<SystemSettings>): Promise<ISystem | null> {
    try {
      logInfo('🔧 [MongoSystemRepository] updateSettings 시작');
      logDebug(`📋 [MongoSystemRepository] 업데이트할 설정: ${JSON.stringify(settingsData, null, 2)}`);

      // 기존 문서 조회
      const existing = await SystemSchema.findOne();
      logInfo(`🔍 [MongoSystemRepository] 기존 문서 조회 결과: ${existing ? '존재' : '없음'}`);

      if (existing) {
        logInfo(`🔍 [MongoSystemRepository] 기존 문서 ID: ${existing._id}`);
        logInfo(`🔍 [MongoSystemRepository] 기존 문서 내용: ${JSON.stringify(existing.toObject(), null, 2)}`);

        // 중첩된 객체 업데이트를 위한 $set 객체 생성
        const updateData: any = {
          updatedAt: new Date(),
        };

        // 각 필드를 개별적으로 처리하여 중첩된 객체 업데이트 보장
        Object.keys(settingsData).forEach((key) => {
          const value = (settingsData as any)[key];
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null) {
              // 중첩된 객체인 경우 각 하위 필드를 개별적으로 설정
              Object.keys(value).forEach((nestedKey) => {
                updateData[`${key}.${nestedKey}`] = value[nestedKey];
              });
            } else {
              // 일반 필드인 경우 직접 설정
              updateData[key] = value;
            }
          }
        });

        // 디버깅: 실제 업데이트할 데이터 로깅
        logDebug(`📋 [MongoSystemRepository] 실제 업데이트할 데이터: ${JSON.stringify(updateData, null, 2)}`);

        // 기존 문서 업데이트 - 더 확실한 방법
        logInfo(`🔧 [MongoSystemRepository] findByIdAndUpdate 호출 시작`);

        let result;

        // runtime 필드가 있는 경우 특별 처리
        if (settingsData.runtime) {
          logInfo(`🔧 [MongoSystemRepository] runtime 필드 특별 처리`);
          const runtimeSet: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (settingsData.runtime.pollingEnabled !== undefined) {
            runtimeSet['runtime.pollingEnabled'] = settingsData.runtime.pollingEnabled;
          }
          if (settingsData.runtime.pollingInterval !== undefined) {
            runtimeSet['runtime.pollingInterval'] = settingsData.runtime.pollingInterval;
          }
          if (settingsData.runtime.applyInProgress !== undefined) {
            runtimeSet['runtime.applyInProgress'] = settingsData.runtime.applyInProgress;
          }
          if (settingsData.runtime.peopleCounterEnabled !== undefined) {
            runtimeSet['runtime.peopleCounterEnabled'] = settingsData.runtime.peopleCounterEnabled;
          }
          if (settingsData.runtime.rebootSchedule !== undefined) {
            runtimeSet['runtime.rebootSchedule'] = settingsData.runtime.rebootSchedule;
          }

          result = await SystemSchema.findByIdAndUpdate(
            existing._id,
            { $set: runtimeSet },
            { new: true },
          );
        } else {
          // 일반적인 업데이트
          result = await SystemSchema.findByIdAndUpdate(
            existing._id,
            {
              $set: updateData,
            },
            { new: true },
          );
        }

        logInfo(`🔧 [MongoSystemRepository] findByIdAndUpdate 호출 완료`);
        logInfo('✅ [MongoSystemRepository] 기존 문서 업데이트 완료');
        logDebug(
          `📋 [MongoSystemRepository] 업데이트 결과: ${JSON.stringify(
            result?.toObject ? result.toObject() : result,
            null,
            2,
          )}`,
        );
        return result;
      }
      logInfo('🔧 [MongoSystemRepository] 새 문서 생성 시작');
      // 새 문서 생성 (기본값 + 전달받은 설정)
      const defaultSettings = (SystemSchema as any).getDefaultSettings();
      const newDoc = {
        ...defaultSettings,
        ...settingsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logDebug(`📋 [MongoSystemRepository] 새로 생성할 문서: ${JSON.stringify(newDoc, null, 2)}`);

      const result = await SystemSchema.create(newDoc);
      logInfo('✅ [MongoSystemRepository] 새 문서 생성 완료');
      logDebug(
        `📋 [MongoSystemRepository] 생성된 문서: ${JSON.stringify(
          result.toObject ? result.toObject() : result,
          null,
          2,
        )}`,
      );
      return result;
    } catch (error) {
      logInfo(`❌ [MongoSystemRepository] updateSettings 실패: ${error}`);
      throw error;
    }
  }

  async updateSystemMode(mode: SystemMode['mode']): Promise<ISystem | null> {
    let systemDoc = await SystemSchema.findOne();
    if (!systemDoc) {
      systemDoc = new SystemSchema();
    }

    // systemDoc.mode = mode; // mode 필드 제거됨
    return await systemDoc.save();
  }

  async resetToDefault(): Promise<ISystem | null> {
    const defaultSettings = (SystemSchema as any).getDefaultSettings();
    return await SystemSchema.findOneAndUpdate({}, defaultSettings, {
      new: true,
      upsert: true,
      runValidators: true,
    });
  }

  async saveSystemSettings(settingsData: SystemSettings): Promise<ISystem | null> {
    logInfo('🔧 [MongoSystemRepository] saveSystemSettings 시작');
    logDebug(`📋 입력받은 settingsData: ${JSON.stringify(settingsData, null, 2)}`);

    const systemDoc = {
      ...settingsData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logDebug(`📋 새로 생성될 systemDoc: ${JSON.stringify(systemDoc, null, 2)}`);

    const existing = await SystemSchema.findOne();
    if (existing) {
      logInfo('⚠️ [MongoSystemRepository] 기존 문서가 존재합니다. 덮어쓰기 전 상태:');
      logDebug(`📋 기존 _id: ${existing._id}`);
      logDebug(`📋 기존 내용: ${JSON.stringify(existing.toObject(), null, 2)}`);
      logInfo('⚠️ [MongoSystemRepository] findByIdAndUpdate로 덮어씁니다!');

      const result = await SystemSchema.findByIdAndUpdate(existing._id, systemDoc, { new: true, upsert: true });
      logInfo('✅ [MongoSystemRepository] findByIdAndUpdate 완료');
      logDebug(`📋 결과 문서: ${JSON.stringify(result?.toObject ? result.toObject() : result, null, 2)}`);
      return result;
    }
    logInfo('✅ [MongoSystemRepository] 기존 문서가 없습니다. 새로 생성합니다.');
    const result = await SystemSchema.create(systemDoc);
    logInfo('✅ [MongoSystemRepository] create 완료');
    logDebug(`📋 생성된 문서: ${JSON.stringify(result.toObject ? result.toObject() : result, null, 2)}`);
    return result;
  }
}
