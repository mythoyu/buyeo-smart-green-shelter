import { User as UserSchema, IUser } from '../../models/schemas/UserSchema';

import { IUserRepository, CreateUserDto, UpdateUserDto } from './interfaces/IUserRepository';

export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<IUser | null> {
    return await UserSchema.findById(id);
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return await UserSchema.findOne({ username });
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    let query = {};

    if (search) {
      query = {
        username: { $regex: search, $options: 'i' },
      };
    }

    const [users, total] = await Promise.all([
      UserSchema.find(query).skip(skip).limit(limit),
      UserSchema.countDocuments(query),
    ]);

    return { users, total };
  }

  async create(data: CreateUserDto): Promise<IUser> {
    const newUser = new UserSchema(data);
    return await newUser.save();
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser | null> {
    const updateData: any = { ...data, updatedAt: new Date() };

    // id가 ObjectId 형식인지 확인
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId 형식이면 findByIdAndUpdate 사용
      return await UserSchema.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
    }
    // username 형식이면 findOneAndUpdate 사용
    return await UserSchema.findOneAndUpdate({ username: id }, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id: string): Promise<boolean> {
    // id가 ObjectId 형식인지 확인
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId 형식이면 findByIdAndDelete 사용
      const result = await UserSchema.findByIdAndDelete(id);
      return !!result;
    }
    // username 형식이면 findOneAndDelete 사용
    const result = await UserSchema.findOneAndDelete({ username: id });
    return !!result;
  }

  async changePassword(id: string, newPassword: string): Promise<boolean> {
    // id가 ObjectId 형식인지 확인
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId 형식이면 findByIdAndUpdate 사용
      const result = await UserSchema.findByIdAndUpdate(
        id,
        { password: newPassword, updatedAt: new Date() },
        { new: true, runValidators: true },
      );
      return !!result;
    }
    // username 형식이면 findOneAndUpdate 사용
    const result = await UserSchema.findOneAndUpdate(
      { username: id },
      { password: newPassword, updatedAt: new Date() },
      { new: true, runValidators: true },
    );
    return !!result;
  }
}
