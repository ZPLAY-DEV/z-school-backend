import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToClass } from 'class-transformer';
import * as crypto from 'crypto';
import { THIRTY_DAYS } from 'src/common/constants';
import { Role } from 'src/common/enums';
import { AuthTokenDto } from 'src/domain/auth/dto/auth-token.dto';
import { LoginCredentialsDto } from 'src/domain/auth/dto/login-credentials.dto';
import {
  RegisterCredentialsDto,
  RegisterManagerCredentialsDto,
} from 'src/domain/auth/dto/register-credentials.dto';
import { ResetPasswordDto } from 'src/domain/auth/dto/reset-password.dto';
import { UserCredentialsDto } from 'src/domain/auth/dto/user-credentials.dto';
import { UserDto } from 'src/domain/auth/dto/user.dto';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Affiliation } from 'src/domain/manager/entities/affiliation.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Token } from 'src/domain/user/entities/token.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { normalizePhone } from 'src/helpers/phone';
import { SlackService } from 'src/services/slack/slack.service';
import { DataSource, In, IsNull, MoreThan, Repository } from 'typeorm';
import * as uuid from 'uuid';
import { AuthUserDto } from './dto/auth-user.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SchoolInfo } from './dto/school-info.dto';

type TokenClaims = {
  sub: number;
  username: string;
  role: Role;
  schoolId: number | null;
  contextHash: string;
};

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly environment: string;
  private readonly appUrl: string;

  private readonly affiliationRepository: Repository<Affiliation>;
  private readonly instructorRepository: Repository<Instructor>;
  private readonly managerRepository: Repository<Manager>;
  private readonly parentRepository: Repository<Parent>;
  private readonly schoolRepository: Repository<School>;
  private readonly recipientRepository: Repository<Recipient>;
  private readonly tokenRepository: Repository<Token>;
  private readonly userRepository: Repository<User>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly slack: SlackService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get<string>('nodeEnv', 'dev');
    this.appUrl = this.configService.get<string>(
      'appUrl',
      'http://localhost:3000',
    );

    this.affiliationRepository = this.dataSource.getRepository(Affiliation);
    this.instructorRepository = this.dataSource.getRepository(Instructor);
    this.managerRepository = this.dataSource.getRepository(Manager);
    this.parentRepository = this.dataSource.getRepository(Parent);
    this.schoolRepository = this.dataSource.getRepository(School);
    this.recipientRepository = this.dataSource.getRepository(Recipient);
    this.tokenRepository = this.dataSource.getRepository(Token);
    this.userRepository = this.dataSource.getRepository(User);
  }

  /**
   * Validates user credentials against the database
   * Used by passport local strategy and login method
   */
  async validateUser(dto: UserCredentialsDto): Promise<User> {
    const { username, password, role } = dto;

    const user = await this.userRepository.findOne({
      where: { username },
      relations: [
        'instructor',
        'instructor.sams',
        'instructor.sams.school',
        'parent',
        'parent.students',
        'manager',
        'manager.affiliations',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hasRole = this.checkUserHasRole(user, role);
    if (!hasRole) {
      throw new UnauthorizedException('Invalid role');
    }

    // user.password가 null인 경우 처리
    if (!user.password) {
      throw new UnauthorizedException('회원가입부터 하세요.');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateUserWithNanoid(id: string): Promise<User> {
    const recipient = await this.recipientRepository.findOneOrFail({
      where: { nanoid: id },
      relations: ['student', 'student.parent', 'student.parent.user'],
    });

    const parent = recipient.student.parent;
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    let user: User | undefined = parent.user;

    // User가 없는 경우 새로 생성
    if (!user) {
      user = await this.userRepository.save(
        new User({
          username: parent.phone,
          phone: parent.phone,
        }),
      );

      // Parent와 User 연결
      await this.parentRepository.update(parent.id, {
        userId: user.id,
      });

      // 관계 업데이트를 위해 다시 조회
      const updatedParent = await this.parentRepository.findOne({
        where: { id: parent.id },
        relations: ['user'],
      });

      user = updatedParent?.user || user;
    }

    if (!user) {
      throw new Error('User not found and could not be created');
    }

    return { ...user, parent };
  }

  /**
   * ✅ Register a parent or instructor user
   * - 한번 가입 후 다시 재가입은 안된다.
   * - 다자녀 학부모의 경우, 무조건 첫번째 자녀로 로그인된다.
   *  가능하도록.
   */
  async register(dto: RegisterCredentialsDto): Promise<LoginResponseDto> {
    try {
      const user = await this.findOrCreateUser({
        ...dto,
        username: dto.username ?? (normalizePhone(dto.phone) as string),
        phone: normalizePhone(dto.phone) as string,
      });

      // 여러 학교에 연결된 경우 (다자녀 부모, 여러학교 강의), 첫번째 학교를 사용
      if (
        (dto.role === Role.PARENT || dto.role === Role.INSTRUCTOR) &&
        !dto.schoolId
      ) {
        const schoolId = await this.determineSchoolId(user, dto.role);
        dto.schoolId = schoolId;
      }

      const { accessToken, refreshToken } = await this.generateTokens(
        user,
        dto.role,
        dto.schoolId,
      );

      // 💥 fire and forget) Send Slack notification
      this.sendRegistrationSlack(user, dto.role).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // Return response
      return {
        success: true,
        user: plainToClass(UserDto, user, {
          excludeExtraneousValues: true,
        }),
        role: dto.role,
        accessToken,
        refreshToken,
      } as LoginResponseDto;
    } catch (error) {
      this.logger.error('register() error:', error);
      throw error;
    }
  }

  /**
   * ✅ Register a manager
   */
  async registerManager(
    dto: RegisterManagerCredentialsDto,
  ): Promise<LoginResponseDto> {
    try {
      const user = await this.createManager(dto);
      const { accessToken, refreshToken } = await this.generateTokens(
        user,
        dto.role,
      );

      // 💥 fire and forget) Send Slack notification
      this.sendRegistrationSlack(user, dto.role).catch((error) => {
        this.logger.warn('Failed to send Slack notification', error);
      });

      // Return response
      return {
        success: true,
        user: plainToClass(UserDto, user, {
          excludeExtraneousValues: true,
        }),
        role: dto.role,
        accessToken,
        refreshToken,
      } as LoginResponseDto;
    } catch (error) {
      this.logger.error(`registerManager() error:`, error);
      throw error; // Pass through already formatted errors
    }
  }

  /**
   * Log in a user and generate auth tokens
   */
  async login(dto: LoginCredentialsDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(dto);
    const schoolId = this.resolveSchoolId(dto.role, dto.schoolId);
    // const schoolIds = this.findSchoolIdsForUser(user, dto.role);
    // if (!schoolId || !schoolIds.includes(schoolId)) {
    //   throw new BadRequestException(
    //     `잘못된 schoolId(${schoolId})가 지정되었습니다.`,
    //   );
    // }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      dto.role,
      schoolId,
    );

    return {
      success: true,
      user: plainToClass(UserDto, user, { excludeExtraneousValues: true }),
      role: dto.role,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Log in a user and generate auth tokens
   */
  async loginWithNanoid(nanoid: string): Promise<AuthUserDto> {
    const user = await this.validateUserWithNanoid(nanoid);

    console.log(user);

    const { accessToken, refreshToken } = await this.generateTokensWithNanoid(
      user,
      Role.PARENT,
    );
    return {
      user: plainToClass(UserDto, user, { excludeExtraneousValues: true }),
      role: Role.PARENT,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Log out a user by removing their refresh token(s)
   */
  async logout(
    userId: number,
    role: Role,
    refreshToken?: string | null,
  ): Promise<void> {
    if (refreshToken) {
      // Logout specific device
      const partialToken = `${refreshToken}-L`;
      const tokenRecord = await this.tokenRepository.findOne({
        where: { userId, role, partialToken },
      });

      if (
        tokenRecord &&
        (await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
      ) {
        await this.tokenRepository.delete(tokenRecord.id);
      }
    } else {
      // Logout all devices for this role
      await this.tokenRepository.delete({ userId, role });
    }
  }

  /**
   * Log out a user from all devices by deleting all refresh tokens
   */
  async logoutAll(userId: number): Promise<void> {
    await this.tokenRepository.delete({ userId });
  }

  /**
   * Refresh an access token using a valid refresh token
   */
  async refreshToken(
    userId: number,
    role: Role,
    refreshToken: string,
  ): Promise<AuthTokenDto> {
    this.logger.log('=== AuthService refreshToken 시작 ===');
    this.logger.log(`입력 파라미터 - userId: ${userId}, role: ${role}`);
    this.logger.log(`refreshToken: ${refreshToken.substring(0, 20)}...`);

    const searchCriteria = {
      userId,
      role,
      partialToken: `${refreshToken}-L`,
      expiresAt: MoreThan(new Date()),
    };
    this.logger.log('토큰 검색 조건:', JSON.stringify(searchCriteria, null, 2));

    const tokenRecord = await this.tokenRepository.findOne({
      where: searchCriteria,
      relations: ['user', 'user.instructor', 'user.parent', 'user.manager'],
    });

    this.logger.log(
      `토큰 레코드 검색 결과: ${tokenRecord ? '발견됨' : '없음'}`,
    );

    if (tokenRecord) {
      this.logger.log(`토큰 만료 시간: ${tokenRecord.expiresAt.toISOString()}`);
      this.logger.log(
        `사용자 ID: ${tokenRecord.userId}, 역할: ${tokenRecord.role}`,
      );
      this.logger.log(`학교 ID: ${tokenRecord.schoolId}`);
    }

    if (
      !tokenRecord ||
      !(await bcrypt.compare(refreshToken, tokenRecord.hashedToken))
    ) {
      this.logger.error('토큰 검증 실패');
      this.logger.error(`토큰 레코드 존재: ${!!tokenRecord}`);
      if (tokenRecord) {
        this.logger.error(
          `bcrypt 비교 결과: ${await bcrypt.compare(refreshToken, tokenRecord.hashedToken)}`,
        );
      }
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.log('토큰 검증 성공');

    const user = tokenRecord.user;
    this.logger.log(`사용자 정보 - ID: ${user.id}, username: ${user.username}`);

    const hasRole = this.checkUserHasRole(user, role);
    this.logger.log(`사용자 역할 확인 결과: ${hasRole}`);

    if (!hasRole) {
      this.logger.error('사용자에게 요청된 역할이 없습니다');
      throw new UnauthorizedException('Access denied');
    }

    // Use schoolId from tokenRecord for consistency
    const schoolId = tokenRecord.schoolId;
    this.logger.log(`새 액세스 토큰 생성 - schoolId: ${schoolId}`);

    const accessToken = await this.generateAccessToken({
      sub: user.id,
      username: user.username,
      role,
      schoolId,
    });

    this.logger.log(
      `새 액세스 토큰 생성 완료: ${accessToken.substring(0, 20)}...`,
    );
    this.logger.log('=== AuthService refreshToken 완료 ===');

    return { accessToken };
  }

  /**
   * Switch school context for a user
   */
  async switchSchool(
    userId: number,
    role: Role,
    schoolId: number | null,
  ): Promise<AuthTokenDto> {
    try {
      // Get user with relations
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'instructor',
          'instructor.sams',
          'instructor.sams.school',
          'parent',
          'parent.students',
          'parent.students.school',
          'manager',
          'manager.affiliations',
        ],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify user has the specified role
      const hasRole = this.checkUserHasRole(user, role);
      if (!hasRole) {
        throw new UnauthorizedException(
          'User does not have the specified role',
        );
      }

      // Determine schoolId with priority: requestedSchoolId ->  schoolId -> fallback
      let finalSchoolId: number;

      if (schoolId !== null && schoolId !== undefined) {
        // 1. Use requested schoolId from DTO
        finalSchoolId = schoolId;
      } else {
        // 3. Fallback to first available school (emergency only)
        finalSchoolId = await this.determineSchoolId(user, role);
        this.logger.warn(
          `Using fallback schoolId ${finalSchoolId} for user ${userId} with role ${role} - this should be avoided`,
        );
      }

      // Validate schoolId for the role
      const schoolIds = this.findSchoolIdsForUser(user, role);
      if (!schoolIds.includes(finalSchoolId)) {
        // todo. fix this
        throw new BadRequestException(
          `Invalid schoolId ${finalSchoolId} for this user and role`,
        );
      }

      // Invalidate all existing tokens for this user and role
      await this.invalidateTokensByContext(userId, role, finalSchoolId);

      // Generate new tokens with final schoolId
      const { accessToken } = await this.generateTokens(
        user,
        role,
        finalSchoolId,
      );

      this.logger.log(
        `User ${userId} switched to school ${finalSchoolId} with role ${role}`,
      );

      return { accessToken };
    } catch (error) {
      this.logger.error(`Error switching school for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset a user's password
   */
  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new NotFoundException('Phone not found');
    }

    // OTP validation code commented out in original
    // const key = `${this.env}:user:${user.id}:otp`;
    // const value = await this.cacheManager.get(key);
    // if (!value) {
    //   throw new BadRequestException('otp expired');
    // } else if (value !== dto.code) {
    //   throw new BadRequestException('otp mismatched');
    // }

    const updatedUser = await this.userRepository.preload({
      id: user.id,
      password: dto.password,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return await this.userRepository.save(updatedUser);
  }

  //? ---------------------------------------------------------------------- ?//
  //? Helpers
  //? ---------------------------------------------------------------------- ?//

  /**
   * Generate context hash for role + schoolId combination
   */
  private generateContextHash(role: Role, schoolId: number | null): string {
    const context = `${role}:${schoolId || 'null'}`;
    return crypto
      .createHash('sha256')
      .update(context)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Resolve schoolId with priority: dto.schoolId -> header.schoolId -> null
   */
  private resolveSchoolId(role: Role, schoolId?: number): number | null {
    if (schoolId) {
      return schoolId;
    }

    // if (role === Role.MANAGER) {
    //   throw new BadRequestException('로그인할 학교를 지정해주세요.');
    // }

    return null;
  }

  /**
   * ✅ Determine schoolId based on user role - for fallback only
   */
  private async determineSchoolId(user: User, role: Role): Promise<number> {
    try {
      switch (role) {
        case Role.MANAGER: {
          if (
            !user.manager?.affiliations ||
            user.manager.affiliations.length === 0
          ) {
            throw new BadRequestException(
              `연결된 학교정보가 없는 관리자 사용자(${user.id}) 입니다.`,
            );
          }

          // 활성화된 첫 번째 학교를 사용
          const activeSchool = user.manager.affiliations.find(
            (ms) => ms.isActive,
          );
          if (!activeSchool) {
            throw new BadRequestException(
              `활성화된 학교가 없는 관리자 사용자(${user.id}) 입니다.`,
            );
          }

          return activeSchool.schoolId;
        }

        case Role.PARENT: {
          const parent = await this.parentRepository.findOne({
            where: { userId: user.id },
            relations: ['students', 'students.school'],
          });

          if (!parent || !parent.students || parent.students.length === 0) {
            throw new BadRequestException(
              `연결된 학생정보가 없는 학부모 사용자(${user.id}) 입니다.`,
            );
          }

          // fallback: 학생의 첫번째 학교를 사용
          const firstStudent = parent.students[0];
          if (!firstStudent.schoolId) {
            throw new BadRequestException(
              `학교정보없이 잘못 등록된 학생(${firstStudent.id})의 학부모 사용자(${user.id}) 입니다.`,
            );
          }

          return firstStudent.schoolId;
        }

        case Role.INSTRUCTOR: {
          const instructor = await this.instructorRepository.findOne({
            where: { userId: user.id },
            relations: ['sams', 'sams.school'],
          });

          if (!instructor || !instructor.sams || instructor.sams.length === 0) {
            throw new BadRequestException(
              `강의정보가 없는 강사 사용자(${user.id})입니다.`,
            );
          }

          // fallback: 담임쌤의 첫번째 학교를 사용
          const firstSam = instructor.sams[0];
          if (!firstSam.schoolId) {
            throw new BadRequestException(
              `강의정보없이 잘못 등록된 단임쌤(${firstSam.id})의 강사 사용자(${user.id}) 입니다.`,
            );
          }

          return firstSam.schoolId;
        }

        default:
          throw new BadRequestException(
            `잘못된 role(${role})이 지정되었습니다.`,
          );
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to determine schoolId for user ${user.id} with role ${role}. ${error.message}`,
      );
    }
  }

  /**
   * ✅ Find schoolIds for a user with specific role
   */
  private findSchoolIdsForUser(user: User, role: Role): number[] {
    switch (role) {
      case Role.MANAGER:
        return (
          user.manager?.affiliations
            ?.filter((ms) => ms.isActive)
            ?.map((ms) => ms.schoolId) ?? []
        );

      case Role.PARENT:
        return [
          ...new Set(
            user.parent?.students.map((student) => student.schoolId) ?? [],
          ),
        ];

      case Role.INSTRUCTOR:
        return [
          ...new Set(user.instructor?.sams.map((sam) => sam.schoolId) ?? []),
        ];

      default:
        return [];
    }
  }

  /**
   * ✅ Get school information for given school Ids
   */
  private async getSchoolInfos(schoolIds: number[]): Promise<SchoolInfo[]> {
    const schools = await this.schoolRepository.find({
      where: { id: In(schoolIds) },
      select: ['id', 'name', 'schoolCode', 'region', 'address'],
    });

    return schools.map((school) => ({
      id: school.id,
      name: school.name,
      schoolCode: school.schoolCode,
      region: school.region,
      address: school.address,
    }));
  }

  /**
   * Invalidate tokens by context (role + schoolId combination)
   */
  private async invalidateTokensByContext(
    userId: number,
    role: Role,
    schoolId: number | null,
  ): Promise<void> {
    try {
      // 정확한 role + schoolId 조합의 토큰만 삭제
      const whereCondition =
        schoolId !== null
          ? { userId, role, schoolId }
          : { userId, role, schoolId: IsNull() };

      await this.tokenRepository.delete(whereCondition);
    } catch (error) {
      this.logger.error(
        `Error invalidating tokens for user ${userId}, role ${role}, schoolId ${schoolId}:`,
        error,
      );
      // 토큰 무효화 실패해도 로그인은 계속 진행
    }
  }

  /**
   * Check if a user has the specified role
   */
  private checkUserHasRole(user: User, role: Role): boolean {
    if (role === Role.INSTRUCTOR && user.instructor) return true;
    if (role === Role.PARENT && user.parent) return true;
    if (role === Role.MANAGER && user.manager) return true;
    return false;
  }

  /**
   * ✅ Register a user (강사 이면서, 학부모인 경우, 이미 존재할 수 도 있다.)
   */
  private async findOrCreateUser(dto: RegisterCredentialsDto): Promise<User> {
    const phone = normalizePhone(dto.phone) as string;
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let user = await this.userRepository.findOne({
      where: { phone },
      relations: ['instructor', 'parent', 'manager'],
    });
    if (user) {
      if (
        user.password !== null &&
        ((dto.role === Role.INSTRUCTOR && user.instructor) ||
          (dto.role === Role.PARENT && user.parent))
      ) {
        throw new ConflictException(
          '동일 전화번호로 등록한 사용자가 이미 존재합니다.',
        );
      }
      await this.userRepository.update(user.id, {
        username: phone,
        phone: phone,
        password: hashedPassword,
      });
    } else {
      user = await this.userRepository.save(
        new User({
          username: phone,
          phone: phone,
          password: hashedPassword,
        }),
      );
    }

    if (dto.role === Role.INSTRUCTOR) {
      const instructor = await this.instructorRepository.findOne({
        where: { phone },
        relations: ['sams'],
      });
      if (instructor) {
        instructor.userId = user.id; // userId 할당
        await this.instructorRepository.upsert(instructor, ['phone']);
      } else {
        throw new ConflictException(
          '이 전화번호는 강사 권한으로 사전등록되지 않았습니다.',
        );
      }
    } else if (dto.role === Role.PARENT) {
      const parent = await this.parentRepository.findOne({
        where: { phone },
      });
      if (parent) {
        parent.userId = user.id; // userId 할당
        await this.parentRepository.upsert(parent, ['phone']);
      } else {
        throw new ConflictException(
          '이 전화번호는 학부모 권한으로 사전등록되지 않았습니다.',
        );
      }
    } else {
      throw new BadRequestException(`유효하지 않은 role(${dto.role}) 입니다.`);
    }

    return await this.userRepository.findOneOrFail({
      where: { phone },
      relations: [
        'instructor',
        'instructor.sams',
        'instructor.sams.school',
        'parent',
        'parent.students',
        'parent.students.school',
        'manager',
      ],
    });
  }

  /**
   * ✅ Find an existing manager by username or create a new one
   */
  private async createManager(
    dto: RegisterManagerCredentialsDto,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (!dto.username.includes('@')) {
      throw new BadRequestException('사용자명은 반드시 @을 포함해야 합니다.');
    }

    // 1. User 레코드 처리
    let user = await this.userRepository.findOne({
      where: { username: dto.username },
      relations: ['manager'],
    });

    if (user) {
      if (user.manager) {
        throw new ConflictException(
          '동일한 사용자명으로 등록한 관리자가 이미 존재합니다.',
        );
      } else {
        // user.manager 정보가 없으면 dto 정보로 user 레코드 덮어쓰기
        await this.userRepository.upsert(
          {
            ...user,
            username: dto.username,
            password: hashedPassword,
          },
          ['username'],
        );
      }
    } else {
      // 존재하지 않는 경우 dto 정보로 user 레코드 생성
      await this.userRepository.upsert(
        {
          username: dto.username,
          password: hashedPassword,
        },
        ['username'],
      );
    }

    // 업데이트된 user 다시 조회
    user = await this.userRepository.findOneOrFail({
      where: { username: dto.username },
      relations: ['manager'],
    });

    // 2. Manager 레코드 처리
    let manager: Manager;

    if (!dto.phone) {
      // dto.phone이 없는 경우 dto.school 반드시 있어야 함
      if (!dto.school) {
        throw new BadRequestException(
          '전화번호가 없는 경우 학교 정보는 반드시 제공되어야 합니다.',
        );
      }

      // dto.school 정보로 학교를 upsert
      await this.dataSource.query(
        `\
        INSERT INTO schools (schoolCode, name, phone, authorityCode, region, address)
        VALUES (?, ?, ?, ?, ?, ?) AS new_values
        ON DUPLICATE KEY UPDATE
          name = new_values.name,
          phone = new_values.phone,
          authorityCode = new_values.authorityCode,
          region = new_values.region,
          address = new_values.address
      `,
        [
          dto.school.schoolCode,
          dto.school.name,
          dto.school.phone,
          dto.school.authorityCode,
          dto.school.region,
          dto.school.address,
        ],
      );

      // 생성된/업데이트된 학교 정보 조회
      const schoolEntity = await this.schoolRepository.findOne({
        where: { schoolCode: dto.school.schoolCode },
      });

      if (!schoolEntity) {
        throw new BadRequestException('학교 정보 생성에 실패했습니다.');
      }

      // 이 학교의 manager를 생성
      manager = await this.managerRepository.save(
        new Manager({
          name: dto.name,
          phone: null,
          note: dto.note,
          userId: user.id,
        }),
      );

      // Affiliation 관계 생성 (upsert 사용)
      await this.affiliationRepository.upsert(
        {
          managerId: manager.id,
          schoolId: schoolEntity.id,
          schoolName: schoolEntity.name,
          isActive: true,
        },
        ['managerId', 'schoolId'],
      );
    } else {
      // dto.phone이 있는 경우
      const phone = normalizePhone(dto.phone) as string;

      // 이 정보에 연결된 manager를 찾는다
      const foundManager = await this.managerRepository.findOne({
        where: { phone },
        relations: ['affiliations'],
      });

      if (!foundManager) {
        // manager가 없으면 생성
        manager = await this.managerRepository.save(
          new Manager({
            name: dto.name,
            phone: phone,
            note: dto.note,
            userId: user.id,
          }),
        );
      } else {
        manager = foundManager;

        // manager가 있다면, 이 manager와 연결된 affiliation을 찾아본다
        if (!manager.affiliations || manager.affiliations.length === 0) {
          throw new NotFoundException(
            '관리자가 존재하지만, 해당 관리자가 관리하는 학교정보가 없습니다.',
          );
        }

        // 정상적인 경우이므로 이 manager.id를 user에 연결
        await this.managerRepository.update(manager.id, {
          name: dto.name,
          note: dto.note,
          userId: user.id,
        });
      }

      // schoolIds가 있는 경우 처리
      if (dto.schoolIds && dto.schoolIds.length > 0) {
        // schoolIds의 모든 학교가 존재하는지 검증
        const schools = await this.schoolRepository.find({
          where: { id: In(dto.schoolIds) },
        });

        if (schools.length !== dto.schoolIds.length) {
          const foundSchoolIds = schools.map((school) => school.id);
          const missingSchoolIds = dto.schoolIds.filter(
            (id) => !foundSchoolIds.includes(id),
          );
          throw new NotFoundException(
            `다음 학교 ID들이 존재하지 않습니다: ${missingSchoolIds.join(', ')}`,
          );
        }

        // 모든 학교와 affiliation 관계 생성 (upsert 사용)
        for (const school of schools) {
          await this.affiliationRepository.upsert(
            {
              managerId: manager.id,
              schoolId: school.id,
              schoolName: school.name,
              isActive: true,
            },
            ['managerId', 'schoolId'],
          );
        }
      }
    }

    user = await this.userRepository.findOneOrFail({
      where: { id: user.id },
      relations: [
        'instructor',
        'instructor.sams',
        'instructor.sams.school',
        'parent',
        'parent.students',
        'parent.students.school',
        'manager',
        'manager.affiliations',
      ],
    });

    console.log('💚 user', user);

    return user;
  }

  // ------------------------------------------------------------------------ //

  /**
   * Generate both access and refresh tokens
   */
  private async generateTokens(
    user: User,
    role: Role,
    schoolId?: number | null,
  ): Promise<TokenData> {
    let finalSchoolId: number;

    if (schoolId) {
      finalSchoolId = schoolId;
    } else {
      finalSchoolId = await this.determineSchoolId(user, role);
    }

    // Generate access token
    const claims = {
      sub: user.id,
      username: user.username,
      role,
      schoolId: finalSchoolId,
    };

    const accessToken = await this.generateAccessToken(claims);

    // Invalidate existing tokens for this context
    await this.invalidateTokensByContext(user.id, role, finalSchoolId);

    // Check for existing tokens with same context
    const existingTokens = await this.tokenRepository.find({
      where: {
        userId: user.id,
        role,
        schoolId: finalSchoolId === null ? IsNull() : finalSchoolId,
      },
    });

    let refreshToken: string;
    if (existingTokens.length === 0) {
      // Generate new refresh token
      refreshToken = `Z-${user.id}-${role.charAt(0)}-${uuid.v4()}`;
      const partialToken = `${refreshToken}-L`;
      const hashedToken = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date(Date.now() + THIRTY_DAYS);

      // Store token in database
      await this.tokenRepository.upsert(
        {
          userId: user.id,
          role,
          schoolId: finalSchoolId,
          partialToken,
          hashedToken,
          expiresAt,
        },
        ['userId', 'role', 'schoolId', 'partialToken'],
      );
    } else {
      // Reuse existing token (get the latest one)
      const latestToken = existingTokens.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt)
          ? current
          : latest;
      });
      refreshToken = latestToken.partialToken.slice(0, -2);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate an access token
   */
  private async generateAccessToken(
    payload: Omit<TokenClaims, 'contextHash'>,
  ): Promise<string> {
    const contextHash = this.generateContextHash(
      payload.role,
      payload.schoolId,
    );

    const tokenClaims: TokenClaims = {
      ...payload,
      contextHash,
    };

    const accessTokenOptions = {
      secret: this.configService.get('jwt.authSecret'),
      expiresIn: '1h' as const, //? ONE_HOUR,
    };

    return this.jwtService.signAsync(tokenClaims, accessTokenOptions);
  }

  /**
   * Generate both access and refresh tokens
   */
  private async generateTokensWithNanoid(
    user: User,
    role: Role,
  ): Promise<TokenData> {
    // Determine schoolId for parent
    const schoolId = await this.determineSchoolId(user, role);

    // Generate access token
    const payload = {
      sub: user.id,
      username: user.username,
      role,
      schoolId,
    };

    const accessToken = await this.generateAccessToken(payload);

    // Invalidate existing tokens for this context
    await this.invalidateTokensByContext(user.id, role, schoolId);

    const existingTokens = await this.tokenRepository.find({
      where: {
        userId: user.id,
        role,
        schoolId: schoolId === null ? IsNull() : schoolId,
      },
    });

    let refreshToken: string;
    if (existingTokens.length === 0) {
      // Generate refresh token
      refreshToken = `Z-${user.id}-${role.charAt(0)}-${uuid.v4()}`;
      const partialToken = `${refreshToken}-L`;
      const hashedToken = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date(Date.now() + THIRTY_DAYS);

      // Store token in database
      await this.tokenRepository.upsert(
        {
          userId: user.id,
          role,
          schoolId,
          partialToken,
          hashedToken,
          expiresAt,
        },
        ['userId', 'role', 'schoolId', 'partialToken'],
      );
    } else {
      const latestToken = existingTokens.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt)
          ? current
          : latest;
      });
      refreshToken = latestToken.partialToken.slice(0, -2);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  // ------------------------------------------------------------------------ //

  /**
   * Get current user information
   */
  async getCurrentUser(userId: number, role: Role): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'instructor',
        'instructor.sams',
        'instructor.sams.school',
        'parent',
        'parent.students',
        'parent.students.school',
        'manager',
        'manager.affiliations',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hasRole = this.checkUserHasRole(user, role);
    if (!hasRole) {
      throw new UnauthorizedException('Access denied');
    }

    return plainToClass(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * ✅ Send registration notification to Slack
   */
  private async sendRegistrationSlack(user: User, role: Role): Promise<void> {
    if (this.environment !== 'dev') {
      const userId = user.id;
      const username = user.username ?? role;
      await this.slack.sendMessage({
        channel: 'activity',
        text: `[${this.environment}-api] 🥳 회원가입(credentials) : <${this.appUrl}/users/${userId}|${username}>`,
      });
    }
  }
}
