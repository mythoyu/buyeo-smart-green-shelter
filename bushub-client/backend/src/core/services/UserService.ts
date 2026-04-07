import bcrypt from 'bcryptjs';

import { ILogger } from '../../shared/interfaces/ILogger';
import { IUserRepository, CreateUserDto, UpdateUserDto } from '../repositories/interfaces/IUserRepository';

import { IUserService, UserResponseDto } from './interfaces/IUserService';
import { IWebSocketService } from './interfaces/IWebSocketService';

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private webSocketService?: IWebSocketService,
    private logger?: ILogger,
  ) {}

  private toUserResponseDto(user: any): UserResponseDto {
    return {
      id: user._id?.toString() || user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(userData: CreateUserDto): Promise<UserResponseDto> {
    try {
      const newUser = await this.userRepository.create(userData);
      const userResponse = this.toUserResponseDto(newUser);

      // 사용자 생성 성공 브로드캐스팅
      this.webSocketService?.broadcastLog('info', 'user', `새 사용자 생성: ${userResponse.username}`);

      return userResponse;
    } catch (error) {
      // 사용자 생성 실패 브로드캐스팅
      this.webSocketService?.broadcastLog(
        'error',
        'user',
        `사용자 생성 실패: ${userData.username} - ${
          error instanceof Error ? error.message : '사용자 생성 중 오류가 발생했습니다.'
        }`,
      );
      throw error;
    }
  }

  async getUsers(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<{ users: UserResponseDto[]; total: number; page: number; totalPages: number }> {
    const { users, total } = await this.userRepository.findAll(page, limit, search);

    return {
      users: users.map(this.toUserResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findById(id);
    return user ? this.toUserResponseDto(user) : null;
  }

  async updateUser(id: string, updates: UpdateUserDto): Promise<UserResponseDto | null> {
    const updatedUser = await this.userRepository.update(id, updates);
    return updatedUser ? this.toUserResponseDto(updatedUser) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    return await this.userRepository.delete(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // id가 ObjectId 형식인지 확인
      let user;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        // ObjectId 형식이면 findById 사용
        user = await this.userRepository.findById(id);
      } else {
        // username 형식이면 findByUsername 사용
        user = await this.userRepository.findByUsername(id);
      }

      if (!user) {
        const error = new Error('사용자를 찾을 수 없습니다.');
        this.webSocketService?.broadcastLog('error', 'user', `사용자 찾기 실패: ID ${id} - ${error.message}`);
        throw error;
      }

      // 현재 비밀번호 확인
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        const error = new Error('현재 비밀번호가 올바르지 않습니다.');
        this.webSocketService?.broadcastLog('error', 'user', `비밀번호 검증 실패: ID ${id} - ${error.message}`);
        throw error;
      }

      const result = await this.userRepository.changePassword(id, newPassword);

      if (result) {
        this.webSocketService?.broadcastLog('info', 'user', `비밀번호 변경 완료: ${user.username} (ID: ${id})`);
      }

      return result;
    } catch (error) {
      this.webSocketService?.broadcastLog(
        'error',
        'user',
        `비밀번호 변경 실패: ID ${id} - ${
          error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.'
        }`,
      );
      throw error;
    }
  }

  async findByUsername(username: string): Promise<any> {
    try {
      const user = await this.userRepository.findByUsername(username);
      this.logger?.info('사용자명으로 사용자 조회 완료');
      return user;
    } catch (error) {
      this.logger?.error('사용자명으로 사용자 조회 실패');
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<any> {
    return this.findByUsername(username);
  }

  async validatePassword(username: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        return false;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      return isValidPassword;
    } catch (error) {
      this.logger?.error('비밀번호 검증 실패');
      return false;
    }
  }
}
