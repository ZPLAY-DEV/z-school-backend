import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { ChangePasswordDto } from 'src/domain/user/dto/change-password.dto';
import { ChangeUsernameDto } from 'src/domain/user/dto/change-username.dto';
import { CreateUserDto } from 'src/domain/user/dto/create-user.dto';
import { DeleteUserDto } from 'src/domain/user/dto/delete-user.dto';
import { UpdateUserDto } from 'src/domain/user/dto/update-user.dto';
import { Provider } from 'src/domain/user/entities/provider.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { UserNotificationEvent } from 'src/domain/user/events/user-notification.event';
import { S3Service } from 'src/services/aws/s3.service';
import { SlackService } from 'src/services/slack/slack-service';
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
    private eventEmitter: EventEmitter2,
  ) {}

  //? ----------------------------------------------------------------------- //
  //? CREATE
  //? ----------------------------------------------------------------------- //

  // User 생성
  async create(dto: CreateUserDto): Promise<User> {
    return await this.userRepository.save(this.userRepository.create(dto));
  }

  //? ----------------------------------------------------------------------- //
  //? READ
  //? ----------------------------------------------------------------------- //

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
      throw new NotFoundException('user not found');
    }
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
      throw new NotFoundException('user not found');
    }
  }

  // User 상세보기 (w/ unique key)
  async findByUniqueKey(params: FindOneOptions<User>): Promise<User | null> {
    return await this.userRepository.findOne(params);
  }

  //? ----------------------------------------------------------------------- //
  //? UPDATE
  //? ----------------------------------------------------------------------- //

  // User 갱신
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.preload({ id, ...dto });
    if (!user) throw new NotFoundException('User not found');
    return await this.userRepository.save(user as DeepPartial<User>);
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
        throw new NotFoundException(`user not found`);
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
    if (dto.current) {
      if (!user.password) throw new ForbiddenException('invalid credentials');
      const passwordMatches = await bcrypt.compare(dto.current, user.password);
      if (!passwordMatches) {
        throw new ForbiddenException('invalid credentials');
      }
    }
    user.password = dto.password;
    return await this.userRepository.save(user);
  }

  //? ----------------------------------------------------------------------- //
  //? DELETE
  //? ----------------------------------------------------------------------- //

  async softRemove(id: number): Promise<User> {
    const user = await this.findById(id);
    return await this.userRepository.softRemove(user);
  }

  async remove(id: number): Promise<User> {
    const user = await this.findById(id);
    return await this.userRepository.remove(user);
  }

  async removeAvatar(id: number): Promise<void> {
    const user = await this.findById(id);
    const url = user.avatar;
    if (url) {
      await this.s3Service.delete(url);
    }
  }

  // User 탈퇴
  async quit(id: number, dto: DeleteUserDto): Promise<void> {
    const user = await this.findById(id);
    try {
      await this._deleteInquiryComment(id);
      await this._deleteConnection(id);
      await this._deleteFlag(id);
      await this._deleteHate(id);
      await this._deleteInquiry(id);
      await this._deleteJoin(id);
      await this._deleteEvent(id);
      await this._deleteLedger(id);
      await this._deleteLike(id);
      await this._deleteEvent(id);
      await this._deletePlea(id);
      await this._deleteProfile(id);
      await this._deleteProvider(id);
      await this._deleteFeedComment(id);
      await this._deleteReportUserFeed(id);
      await this._deleteReportUserEvent(id);
      await this._deleteReportUserUser(id);
      await this._deleteEventComment(id);
      await this._voidPersonalInformationAndUpsertWithdrawals(
        id,
        dto.message ?? '',
      );
      // await this.softRemove(id);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException();
    }

    await this.slack.sendMessage({
      text: `다음 사용자가 탈퇴했습니다.\n- 아이디:${id}\n- 이름:${user.username}\n- 전화:${user.phone}\n- 이메일:${user.email}`,
    });
  }

  async _deleteInquiryComment(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `opinion` SET deletedAt=NOW() WHERE userId = ?',
      [id],
    );
  }
  async _deleteConnection(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `connection` SET deletedAt=NOW() WHERE userId = ?',
      [id],
    );
  }
  async _deleteFlag(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `flag` WHERE userId = ?',
      [id],
    );
  }
  async _deleteFriendship(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `friendship` WHERE userId = ? OR traineeId = ?',
      [id, id],
    );
  }
  async _deleteHate(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `hate` WHERE userId = ? OR traineeId = ?',
      [id, id],
    );
  }
  async _deleteImpression(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `impression` WHERE userId = ?',
      [id],
    );
  }
  async _deleteInquiry(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `inquiry` WHERE userId = ?',
      [id],
    );
  }
  async _deleteInterest(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `interest` WHERE userId = ?',
      [id],
    );
  }
  async _deleteJoin(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `join` WHERE userId = ? OR traineeId = ?',
      [id, id],
    );
  }
  async _deleteLedger(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `ledger` WHERE userId = ?',
      [id],
    );
  }
  async _deleteLike(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `like` WHERE userId = ?',
      [id],
    );
  }
  async _deleteEvent(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `event` SET deletedAt=NOW() WHERE userId = ?',
      [id],
    );
  }
  async _deletePlea(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `plea` WHERE userId = ? OR traineeId = ?',
      [id, id],
    );
  }
  async _deleteProfile(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `profile` SET balance=0, bio=NULL, mbti=NULL, region=NULL, occupation=NULL, education=NULL,fyis=NULL,images=NULL WHERE userId = ?',
      [id],
    );
  }
  async _deleteProvider(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `provider` WHERE userId = ?',
      [id],
    );
  }
  async _deleteReaction(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `reaction` WHERE userId = ?',
      [id],
    );
  }
  async _deleteFeedComment(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `comment` SET deletedAt=NOW() WHERE userId = ?',
      [id],
    );
  }
  async _deleteReportUserFeed(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `report_connection` WHERE userId = ?',
      [id],
    );
  }
  async _deleteReportUserEvent(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `user_event_report` WHERE userId = ?',
      [id],
    );
  }
  async _deleteReportUserUser(id: number) {
    await this.userRepository.manager.query(
      'DELETE FROM `user_user_report` WHERE userId = ? OR accusedUserId = ?',
      [id, id],
    );
  }
  async _deleteEventComment(id: number) {
    await this.userRepository.manager.query(
      'UPDATE `thread` SET deletedAt=NOW() WHERE userId = ?',
      [id],
    );
  }

  async _voidPersonalInformationAndUpsertWithdrawals(
    id: number,
    message: string,
  ): Promise<any> {
    const user = await this.findById(id, ['providers']);
    const phone =
      user.phone && user.phone.length > 4 ? user.phone.substring(3) : 'n/a';
    const postfix = random.generate({ length: 5, charset: 'numeric' });

    user.username = `${user.username}(탈퇴)`; // unique key
    user.email = null; // unique key
    user.phone = `${phone}:${postfix}`; // unique key
    await this.userRepository.save(user);
    await this.userRepository.manager.query(
      'UPDATE `user` SET password=NULL,career=NULL,avatar=NULL,pushToken=NULL,refreshTokenHash=NULL,isActive=0 WHERE id = ?',
      [id],
    );

    // add a withdrawal entry
    await Promise.all(
      user.providers.map(async (v: Provider) => {
        await this.userRepository.manager.query(
          'INSERT IGNORE INTO `withdrawal` (userId, providerId, reason) VALUES (?, ?, ?) \
ON DUPLICATE KEY UPDATE \
userId = VALUES(`userId`), \
providerId = VALUES(`providerId`), \
reason = VALUES(`reason`)',
          [v.providerId, message, id],
        );
      }),
    );
  }

  //* ---------------------------------------------------------------------- *//
  //* Test
  //* ---------------------------------------------------------------------- *//

  async testNotify(id: number): Promise<void> {
    const user = await this.findById(id);
    const event = new UserNotificationEvent({
      name: 'user',
      userId: user.id,
      token: user.pushToken,
      body: '이것은 푸시 노티피케이션 테스트 메시지 입니다.',
      data: { page: `users/${user.id}` },
    });
    this.eventEmitter.emit('user.notified', event);
  }
}
