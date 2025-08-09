import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import {
  FilterOperator,
  PaginateConfig,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import * as random from 'randomstring';
import { Role } from 'src/common/enums';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ChangePasswordDto } from 'src/domain/user/dto/change-password.dto';
import { ChangeUsernameDto } from 'src/domain/user/dto/change-username.dto';
import { CreateUserDto } from 'src/domain/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/domain/user/dto/update-user.dto';
import { WithdrawUserDto } from 'src/domain/user/dto/withdraw-user.dto';
import { User } from 'src/domain/user/entities/user.entity';
import { normalizePhone } from 'src/helpers/phone';
import { S3Service } from 'src/services/aws/s3.service';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, DeepPartial, FindOneOptions } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    private readonly slack: SlackService,
    private readonly s3Service: S3Service,
    private dataSource: DataSource, // for transaction
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  // User 생성
  async create(dto: CreateUserDto): Promise<User> {
    const phone = normalizePhone(dto.username);
    console.log('🔥 phone', phone);
    console.log('🔥 dto', dto);
    let user: User | undefined;
    if (dto.role === Role.INSTRUCTOR) {
      const instructor = await this.instructorRepository.findOne({
        where: { phone },
      });
      if (instructor) {
        user = await this.userRepository.save(
          this.userRepository.create({ ...dto, username: phone, phone }),
        );
        await this.instructorRepository.update(instructor.id, {
          userId: user.id,
        });
      }
    } else {
      const parent = await this.parentRepository.findOne({
        where: { phone },
      });
      if (parent) {
        user = await this.userRepository.save(
          this.userRepository.create({ ...dto, username: phone, phone }),
        );
        await this.parentRepository.update(parent.id, { userId: user.id });
      }
    }

    if (!user) {
      throw new BadRequestException(
        `the phone # ${dto.username} is not allowed`,
      );
    }

    return user;
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  // User 리스트 (paginated)
  async findAll(query: PaginateQuery): Promise<Paginated<User>> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('user.instructor', 'instructor')
      .leftJoinAndSelect('user.manager', 'manager')
      .loadRelationCountAndMap('user.orderCount', 'user.orders');

    const config: PaginateConfig<User> = {
      relations: {
        parent: true,
        instructor: true,
        manager: true,
      },
      sortableColumns: ['id', 'username', 'updatedAt'],
      searchableColumns: ['email', 'username'],
      defaultLimit: 20,
      defaultSortBy: [['updatedAt', 'DESC']],
      filterableColumns: {
        role: [FilterOperator.EQ, FilterOperator.IN],
        isActive: [FilterOperator.EQ],
        dob: [FilterOperator.GTE, FilterOperator.LT, FilterOperator.BTW],
        gender: [FilterOperator.EQ],
        'profile.region': [FilterOperator.EQ, FilterOperator.IN],
      },
    };

    return await paginate<User>(query, queryBuilder, config);
  }

  // User 상세보기 (w/ id)
  async findById(id: number, relations: string[] = []): Promise<User> {
    try {
      return relations.length > 0
        ? await this.userRepository.findOneOrFail({
            where: { id },
            relations,
            withDeleted: true,
          })
        : await this.userRepository.findOneOrFail({
            where: { id },
            withDeleted: true,
          });
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException('User not found');
    }
  }

  async list(): Promise<User[]> {
    return await this.userRepository.find();
  }

  // User 상세보기 (w/ providerId)
  async findByProviderId(providerId: string): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.parent', 'parent')
        .leftJoinAndSelect('user.instructor', 'instructor')
        .leftJoinAndSelect('user.manager', 'manager')
        .leftJoinAndSelect('user.providers', 'providers')
        .where('providers.providerName = "firebase"')
        .andWhere('providers.providerId = :providerId', { providerId })
        .getOneOrFail();
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException('User not found');
    }
  }

  // User 상세보기 (w/ unique key)
  async findByUniqueKey(params: FindOneOptions<User>): Promise<User | null> {
    return await this.userRepository.findOne(params);
  }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  // User 갱신
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    // return await this.userRepository.updateUser
    const user = await this.userRepository.preload({ id, ...dto });
    if (!user) throw new NotFoundException('User not found');
    return await this.userRepository.save(user as DeepPartial<User>);
  }

  // FCM 토큰 무효화
  async invalidatePushTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.pushToken IN (:...tokens)', { tokens })
      .getMany();

    for (const user of users) {
      user.pushToken = null;
      await this.userRepository.save(user);
    }

    this.logger.log(`Invalidated ${users.length} push tokens`);
  }

  //? User 닉네임 갱신 (비용이 발생할 수 있음)
  async changeUsername(id: number, dto: ChangeUsernameDto): Promise<User> {
    // create a new query runner
    const queryRunner = this.dataSource.createQueryRunner();
    // let newBalance = 0;
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const count = await queryRunner.manager.count(User, {
        where: { username: dto.username },
      });
      const user = await queryRunner.manager.findOne(User, {
        where: { id: id },
        relations: [`profile`],
      });
      if (count > 0) {
        throw new UnprocessableEntityException(`a taken username`);
      }
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
      user.username = dto.username;

      await queryRunner.manager.save(user);
      // commit transaction now:
      await queryRunner.commitTransaction();

      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // User 비밀번호 갱신
  async changePassword(id: number, dto: ChangePasswordDto): Promise<User> {
    const user = await this.findById(id);
    if (user.password) {
      if (!dto.current) throw new ForbiddenException('invalid credentials');
      const passwordMatches = await bcrypt.compare(dto.current, user.password);
      if (!passwordMatches) {
        throw new ForbiddenException('invalid credentials');
      }
    }
    user.password = dto.password;
    return await this.userRepository.save(user);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  async softRemove(id: number): Promise<User> {
    const user = await this.findById(id);
    return await this.userRepository.softRemove(user);
  }

  async remove(id: number): Promise<User> {
    const user = await this.findById(id);
    return await this.userRepository.remove(user);
  }

  // User 탈퇴
  async quit(id: number, dto: WithdrawUserDto): Promise<void> {
    const user = await this.findById(id, [
      'parent',
      'instructor',
      'instructor.sams',
      'instructor.sams.contracts',
    ]);

    console.log('🔥 user', JSON.stringify(user, null, 2));

    if (user.password) {
      if (!dto.current) throw new ForbiddenException('invalid credentials');
      const passwordMatches = await bcrypt.compare(dto.current, user.password);
      if (!passwordMatches) {
        throw new ForbiddenException('invalid credentials');
      }
    }

    if (dto.role === Role.INSTRUCTOR && user.instructor) {
      if (user.instructor.sams.length > 0) {
        for (const sam of user.instructor.sams) {
          for (const contract of sam.contracts) {
            const now = new Date();
            if (
              !contract.endedBy &&
              new Date(contract.start) <= now &&
              new Date(contract.end) > now
            ) {
              throw new ForbiddenException('instructor has active contracts');
            }
          }
        }
      }
      await this._resetInstructor(user.instructor.phone);
    }
    if (dto.role === Role.PARENT && user.parent) {
      await this._resetParent(user.parent.phone);
    }

    try {
      await this._voidPersonalInformationAndUpsertWithdrawals(id, dto);
      // await this.softRemove(id);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException();
    }

    await this.slack.sendMessage({
      channel: 'activity',
      text: `다음 사용자가 탈퇴했습니다.\n- 아이디: ${id}\n- 이름: ${user.username}\n- 역할: ${dto.role}`,
    });
  }

  async _deleteLedger(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `ledgers` WHERE userId = ?',
      [id],
    );
  }
  async _resetInstructor(phone: string) {
    await this.userRepository.manager.query(
      'UPDATE `instructors` SET userId=NULL, name=NULL, note=NULL, termsAgreedAt=NULL WHERE phone = ?',
      [phone],
    );
  }
  async _resetParent(phone: string) {
    await this.userRepository.manager.query(
      'UPDATE `parents` SET userId=NULL, name=NULL, note=NULL, termsAgreedAt=NULL WHERE phone = ?',
      [phone],
    );
  }

  async _voidPersonalInformationAndUpsertWithdrawals(
    id: number,
    dto: WithdrawUserDto,
  ): Promise<any> {
    const user = await this.findById(id);
    const postfix = random.generate({ length: 4, charset: 'numeric' });
    const prefix = user.username.split('.')[0];
    const username = `${prefix}.${postfix}(탈퇴)`;

    user.username = username; // unique key
    user.email = null; // unique key
    user.phone = null; // unique key
    await this.userRepository.save(user);

    // add a withdrawal entry (MySQL 8.0+ alias 문법 사용)
    await this.userRepository.manager.query(
      'INSERT IGNORE INTO `withdrawals` (userId, role, reason) VALUES (?, ?, ?) AS new_withdrawal(userId, role, reason) \
ON DUPLICATE KEY UPDATE \
userId = new_withdrawal.userId, \
role = new_withdrawal.role, \
reason = new_withdrawal.reason',
      [id, dto.role, dto.reason],
    );
  }
}
