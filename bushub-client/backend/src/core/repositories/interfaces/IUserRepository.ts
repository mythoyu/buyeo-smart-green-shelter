import { IUser } from '../../../models/schemas/UserSchema';

export interface CreateUserDto {
  username: string;
  password: string;
  role: string;
  companyId?: string;
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  role?: string;
  companyId?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findAll(page?: number, limit?: number, search?: string): Promise<{ users: IUser[]; total: number }>;
  create(data: CreateUserDto): Promise<IUser>;
  update(id: string, data: UpdateUserDto): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
  changePassword(id: string, newPassword: string): Promise<boolean>;
}
