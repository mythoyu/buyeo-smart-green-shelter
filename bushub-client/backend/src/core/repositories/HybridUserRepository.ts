import { IUser } from '../../models/schemas/UserSchema';

import { IUserRepository, CreateUserDto, UpdateUserDto } from './interfaces/IUserRepository';
import { MemoryUserRepository } from './MemoryUserRepository';
import { MongoUserRepository } from './MongoUserRepository';

export class HybridUserRepository implements IUserRepository {
  constructor(private memoryRepo: MemoryUserRepository, private mongoRepo: MongoUserRepository) {}

  async findById(id: string): Promise<IUser | null> {
    // 먼저 메모리에서 조회
    let user = await this.memoryRepo.findById(id);

    // 메모리에 없으면 MongoDB에서 조회하고 메모리에 캐시
    if (!user) {
      user = await this.mongoRepo.findById(id);
      if (user) {
        const createData: any = {
          username: user.username,
          password: user.password,
          role: user.role,
        };
        if (user.companyId) {
          createData.companyId = user.companyId;
        }
        await this.memoryRepo.create(createData);
      }
    }

    return user;
  }

  async findByUsername(username: string): Promise<IUser | null> {
    // 먼저 메모리에서 조회
    let user = await this.memoryRepo.findByUsername(username);

    // 메모리에 없으면 MongoDB에서 조회하고 메모리에 캐시
    if (!user) {
      user = await this.mongoRepo.findByUsername(username);
      if (user) {
        const createData: any = {
          username: user.username,
          password: user.password,
          role: user.role,
        };
        if (user.companyId) {
          createData.companyId = user.companyId;
        }
        await this.memoryRepo.create(createData);
      }
    }

    return user;
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ users: IUser[]; total: number }> {
    // 메모리에서 조회
    return this.memoryRepo.findAll(page, limit, search);
  }

  async create(data: CreateUserDto): Promise<IUser> {
    // 메모리와 MongoDB에 동시 생성
    const [memoryUser, mongoUser] = await Promise.all([this.memoryRepo.create(data), this.mongoRepo.create(data)]);

    return memoryUser;
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser | null> {
    // 메모리와 MongoDB에 동시 업데이트
    const [memoryResult, mongoResult] = await Promise.all([
      this.memoryRepo.update(id, data),
      this.mongoRepo.update(id, data),
    ]);

    return memoryResult;
  }

  async delete(id: string): Promise<boolean> {
    // 메모리와 MongoDB에서 동시 삭제
    const [memoryResult, mongoResult] = await Promise.all([this.memoryRepo.delete(id), this.mongoRepo.delete(id)]);

    return memoryResult && mongoResult;
  }

  async changePassword(id: string, newPassword: string): Promise<boolean> {
    // 메모리와 MongoDB에서 동시 비밀번호 변경
    const [memoryResult, mongoResult] = await Promise.all([
      this.memoryRepo.changePassword(id, newPassword),
      this.mongoRepo.changePassword(id, newPassword),
    ]);

    return memoryResult && mongoResult;
  }
}
