import { IUser } from '../../models/schemas/UserSchema';

import { IUserRepository, CreateUserDto, UpdateUserDto } from './interfaces/IUserRepository';

export class MemoryUserRepository implements IUserRepository {
  private users: Map<string, IUser> = new Map();
  private usernameIndex: Map<string, string> = new Map(); // username -> userId

  async findById(id: string): Promise<IUser | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<IUser | null> {
    const userId = this.usernameIndex.get(username);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ users: IUser[]; total: number }> {
    let users = Array.from(this.users.values());

    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((user) => user.username.toLowerCase().includes(searchLower));
    }

    const total = users.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + limit);

    return { users: paginatedUsers, total };
  }

  async create(data: CreateUserDto): Promise<IUser> {
    const user = {
      _id: this.generateId(),
      username: data.username,
      password: data.password,
      role: data.role as 'superuser' | 'user' | 'engineer' | 'ex-user',
      companyId: data.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IUser;

    this.users.set(user._id as string, user);
    this.usernameIndex.set(user.username, user._id as string);

    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    // 인덱스 업데이트
    if (data.username && data.username !== existing.username) {
      this.usernameIndex.delete(existing.username);
      this.usernameIndex.set(data.username, id);
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    } as IUser;

    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.usernameIndex.delete(user.username);
    return this.users.delete(id);
  }

  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.password = newPassword;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return true;
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
