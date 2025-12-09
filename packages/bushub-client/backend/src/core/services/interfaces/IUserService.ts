import { IUser } from '../../../models/schemas/UserSchema';
import { CreateUserDto, UpdateUserDto } from '../../repositories/interfaces/IUserRepository';

export interface UserResponseDto {
  id: string;
  username: string;
  role: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserService {
  createUser(userData: CreateUserDto): Promise<UserResponseDto>;
  getUsers(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getUserById(id: string): Promise<UserResponseDto | null>;
  findByUsername(username: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  updateUser(id: string, updates: UpdateUserDto): Promise<UserResponseDto | null>;
  deleteUser(id: string): Promise<boolean>;
  changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean>;
  validatePassword(username: string, password: string): Promise<boolean>;
}
