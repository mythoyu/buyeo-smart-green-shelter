import { Logger } from '../../shared/services/Logger';
import { System as SystemSchema, ISystem } from '../../models/schemas/SystemSchema';

import { ISystemRepository, SystemSettings, SystemMode } from './interfaces/ISystemRepository';

/** findOne()에서 문서 없음 로그 스팸 방지 */
let loggedMissingSystemDoc = false;

export class MongoSystemRepository implements ISystemRepository {
  async findOne(): Promise<ISystem | null> {
    const result = await SystemSchema.findOne();
    if (result) {
      loggedMissingSystemDoc = false;
    } else if (!loggedMissingSystemDoc) {
      loggedMissingSystemDoc = true;
      repoLog.debug('[MongoSystemRepository] SystemSchema 기존 문서 없음 — 기본 시드 대기 또는 최초 설정 필요');
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
      repoLog.info('[MongoSystemRepository] updateSettings 시작');
      repoLog.debug('[MongoSystemRepository] updateSettings payload', {
        keys: Object.keys(settingsData),
        settings: settingsData,
      });

      const existing = await SystemSchema.findOne();
      repoLog.debug('[MongoSystemRepository] existing document', {
        exists: !!existing,
        id: existing?._id?.toString(),
      });

      if (existing) {
        const updateData: any = {
          updatedAt: new Date(),
        };

        Object.keys(settingsData).forEach((key) => {
          const value = (settingsData as any)[key];
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null) {
              Object.keys(value).forEach((nestedKey) => {
                updateData[`${key}.${nestedKey}`] = value[nestedKey];
              });
            } else {
              updateData[key] = value;
            }
          }
        });

        repoLog.debug(`📋 [MongoSystemRepository] 실제 업데이트할 데이터: ${JSON.stringify(updateData, null, 2)}`);
        repoLog.debug('[MongoSystemRepository] findByIdAndUpdate start', { id: existing._id?.toString() });

        let result;

        if (settingsData.runtime) {
          repoLog.debug('[MongoSystemRepository] runtime field patch');
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
          if (typeof (settingsData.runtime as any).exhibitionMode !== 'undefined') {
            runtimeSet['runtime.exhibitionMode'] = (settingsData.runtime as any).exhibitionMode;
          }
          if (typeof (settingsData.runtime as any).peopleCounterEnabled !== 'undefined') {
            runtimeSet['runtime.peopleCounterEnabled'] = (settingsData.runtime as any).peopleCounterEnabled;
          }

          result = await SystemSchema.findByIdAndUpdate(existing._id, { $set: runtimeSet }, { new: true });
        } else {
          result = await SystemSchema.findByIdAndUpdate(
            existing._id,
            {
              $set: updateData,
            },
            { new: true },
          );
        }

        repoLog.info('[MongoSystemRepository] 기존 문서 업데이트 완료', { id: existing._id?.toString() });
        repoLog.debug(
          `📋 [MongoSystemRepository] 업데이트 결과: ${JSON.stringify(
            result?.toObject ? result.toObject() : result,
            null,
            2,
          )}`,
        );
        return result;
      }
      repoLog.info('🔧 [MongoSystemRepository] 새 문서 생성 시작');
      const defaultSettings = (SystemSchema as any).getDefaultSettings();
      const newDoc = {
        ...defaultSettings,
        ...settingsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repoLog.debug(`📋 [MongoSystemRepository] 새로 생성할 문서: ${JSON.stringify(newDoc, null, 2)}`);

      const result = await SystemSchema.create(newDoc);
      repoLog.info('✅ [MongoSystemRepository] 새 문서 생성 완료');
      repoLog.debug(
        `📋 [MongoSystemRepository] 생성된 문서: ${JSON.stringify(
          result.toObject ? result.toObject() : result,
          null,
          2,
        )}`,
      );
      return result;
    } catch (error) {
      repoLog.error(`[MongoSystemRepository] updateSettings 실패: ${error}`);
      throw error;
    }
  }

  async updateSystemMode(mode: SystemMode['mode']): Promise<ISystem | null> {
    let systemDoc = await SystemSchema.findOne();
    if (!systemDoc) {
      systemDoc = new SystemSchema();
    }

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
    repoLog.info('🔧 [MongoSystemRepository] saveSystemSettings 시작');
    repoLog.debug(`📋 입력받은 settingsData: ${JSON.stringify(settingsData, null, 2)}`);

    const systemDoc = {
      ...settingsData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repoLog.debug(`📋 새로 생성될 systemDoc: ${JSON.stringify(systemDoc, null, 2)}`);

    const existing = await SystemSchema.findOne();
    if (existing) {
      repoLog.info('⚠️ [MongoSystemRepository] 기존 문서가 존재합니다. 덮어쓰기 전 상태:');
      repoLog.debug(`📋 기존 _id: ${existing._id}`);
      repoLog.debug(`📋 기존 내용: ${JSON.stringify(existing.toObject(), null, 2)}`);
      repoLog.info('⚠️ [MongoSystemRepository] findByIdAndUpdate로 덮어씁니다!');

      const result = await SystemSchema.findByIdAndUpdate(existing._id, systemDoc, { new: true, upsert: true });
      repoLog.info('✅ [MongoSystemRepository] findByIdAndUpdate 완료');
      repoLog.debug(`📋 결과 문서: ${JSON.stringify(result?.toObject ? result.toObject() : result, null, 2)}`);
      return result;
    }
    repoLog.info('✅ [MongoSystemRepository] 기존 문서가 없습니다. 새로 생성합니다.');
    const result = await SystemSchema.create(systemDoc);
    repoLog.info('✅ [MongoSystemRepository] create 완료');
    repoLog.debug(`📋 생성된 문서: ${JSON.stringify(result.toObject ? result.toObject() : result, null, 2)}`);
    return result;
  }
}

const repoLog = new Logger(MongoSystemRepository.name);
