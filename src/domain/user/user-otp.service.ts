import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { addMinutes, isAfter } from 'date-fns';
import * as random from 'randomstring';
import { AWS_SQS_CLIENT, ZPLAY_SEOUL_NUMBER } from 'src/common/constants';
import { UpdateUserDto } from 'src/domain/user/dto/update-user.dto';
import { Secret } from 'src/domain/user/entities/secret.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { SqsService } from 'src/services/aws/sqs.service';
import { DeepPartial } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class UserOtpService {
  private readonly env: any;
  private readonly logger = new Logger(UserOtpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Secret)
    private readonly secretRepository: Repository<Secret>,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SqsService,
    @Inject(ConfigService) private configService: ConfigService, // global
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // global
  ) {
    this.env = this.configService.get('nodeEnv');
  }

  //? ---------------------------------------------------------------------- ?//
  //? 본인인증 OTP 발송 (전화번호 또는 이메일로 전송)
  //? ---------------------------------------------------------------------- ?//

  async sendOtpForNonExistingUser(val: string, cache = false): Promise<void> {
    const phone = val.includes('@') ? null : val.replace(/-/gi, '');
    const email = val.includes('@') ? val : null;
    const where = val.includes('@')
      ? email
        ? { email }
        : undefined
      : phone
        ? { phone }
        : undefined;

    const user = await this.userRepository.findOne({ where });
    if (user) {
      throw new UnprocessableEntityException('already taken');
    }

    let otp = '';
    if (phone) {
      // 휴대폰본인인증이 필수인 경우, app store 승인정보 제공하기 위한 방법.
      if (phone.startsWith('0101234')) {
        otp = cache
          ? await this._upsertOtpUsingCache(phone, '000000')
          : await this._upsertOtpUsingDb(phone, '000000');
      } else {
        otp = cache
          ? await this._upsertOtpUsingCache(phone)
          : await this._upsertOtpUsingDb(phone);
        await this._sendSmsTo(phone, otp);
      }
    } else {
      if (!email) throw new Error('Email is required');
      otp = cache
        ? await this._upsertOtpUsingCache(email)
        : await this._upsertOtpUsingDb(email);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? 본인인증 OTP 검사 후, User 업데이트
  //? ---------------------------------------------------------------------- ?//

  async updateUserIfOtpMatches(
    val: string,
    otp: string,
    cache: boolean,
    dto: UpdateUserDto,
  ): Promise<User> {
    const phone = val.includes('@') ? null : val.replace(/-/gi, '');
    const email = val.includes('@') ? val : null;
    const where = val.includes('@')
      ? email
        ? { email }
        : undefined
      : phone
        ? { phone }
        : undefined;

    const dbUser = await this.userRepository.findOne({ where });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const key = phone ? phone : email;
    if (!key) throw new Error('Key is required');

    if (cache) {
      const cacheKey = this._getCacheKey(key);
      const cachedOtp = await this.cacheManager.get(cacheKey);
      if (!cachedOtp) {
        throw new UnprocessableEntityException('otp expired');
      } else if (cachedOtp !== otp) {
        throw new UnprocessableEntityException('otp mismatched');
      }
    } else {
      const secret = await this.secretRepository.findOne({
        where: { key: key },
      });

      if (!secret) {
        throw new UnprocessableEntityException('otp unavailable');
      }
      const now = new Date();
      // secret.updatedAt을 기준으로 3분 후의 시간 계산
      const expiredAt = addMinutes(new Date(secret.updatedAt), 3);

      if (isAfter(now, expiredAt)) {
        throw new UnprocessableEntityException(`otp expired`);
      }
      if (secret.otp !== otp) {
        throw new UnprocessableEntityException('otp mismatched');
      }
    }

    const updatedDto = { ...dto };
    if (Object.prototype.hasOwnProperty.call(dto, 'password')) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(dto.password, salt);
      updatedDto.password = passwordHash;
    }
    const user = await this.userRepository.preload({
      id: dbUser.id,
      ...updatedDto,
    });
    if (!user) throw new NotFoundException('User not found');
    return await this.userRepository.save(user as DeepPartial<User>);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 기존회원 본인인증정보 수정) 전화번호/이메일 확인 후 OTP 전송
  //? ---------------------------------------------------------------------- ?//

  async sendOtpForExistingUser(val: string, cache = false): Promise<string> {
    const phone = val.includes('@') ? null : val;
    const email = val.includes('@') ? val : null;
    const where = val.includes('@')
      ? email
        ? { email }
        : undefined
      : phone
        ? { phone }
        : undefined;
    const user = await this.userRepository.findOne({ where });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (phone) {
      const otp = cache
        ? await this._upsertOtpUsingCache(phone)
        : await this._upsertOtpUsingDb(phone);
      await this._sendSmsTo(phone, otp);
    } else {
      if (!email) throw new Error('Email is required');
      // const otp = cache
      //   ? await this._upsertOtpUsingCache(email)
      //   : await this._upsertOtpUsingDb(email);
    }

    return val;
  }

  //? ---------------------------------------------------------------------- ?//
  //? privates
  //? ---------------------------------------------------------------------- ?//

  _getCacheKey(key: string): string {
    return `${this.env}:user:${key}:key`;
  }

  async _upsertOtpUsingDb(key: string, otp?: string): Promise<string> {
    const pass = otp ?? random.generate({ length: 6, charset: 'numeric' });
    await this.userRepository.manager.query(
      "INSERT IGNORE INTO secret (`key`, `otp`) \
VALUES (?, ?) AS new_secret(`key`, `otp`) \
ON DUPLICATE KEY UPDATE `key`=new_secret.`key`, `otp`=new_secret.`otp`, updatedAt=(CONVERT_TZ(NOW(), 'UTC', 'Asia/Seoul'))",
      [key, pass],
    );
    return pass as string;
  }

  async _upsertOtpUsingCache(key: string, otp?: string): Promise<string> {
    const pass = otp ?? random.generate({ length: 6, charset: 'numeric' });
    const cacheKey = this._getCacheKey(key);
    await this.cacheManager.set(cacheKey, pass, 60 * 10);
    return pass as string;
  }

  async _sendSmsTo(phone: string, otp: string): Promise<any> {
    const body = `[] 인증코드 ${otp}`;
    try {
      // Instead of directly sending SMS, queue the message in SQS
      await this.sqsClient.sendMessage({
        type: 'SEND_TEXT',
        data: {
          sender: ZPLAY_SEOUL_NUMBER,
          receiver: phone,
          message: body,
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException('nCloud smsClient error');
    }
  }
}
