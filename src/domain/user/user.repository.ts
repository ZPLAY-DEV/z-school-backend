import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, DeepPartial, FindOneOptions, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  // User 상세보기 (w/ unique key)
  async findByUniqueKey(params: FindOneOptions<User>): Promise<User | null> {
    return await this.findOne(params);
  }

  // User Id 기반 상세보기 (w/ id)
  async findById(id: number, relations: string[] = []): Promise<User> {
    try {
      return relations.length > 0
        ? await this.findOneOrFail({
            where: { id },
            relations,
            withDeleted: true,
          })
        : await this.findOneOrFail({
            where: { id },
            withDeleted: true,
          });
    } catch (error) {
      console.error('findById error:', error);
      throw new NotFoundException(error.message);
    }
  }

  // User Info 갱신
  async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.preload({ id, ...dto });
    if (!user) throw new NotFoundException('User not found');
    return await this.save(user as DeepPartial<User>);
  }
}
