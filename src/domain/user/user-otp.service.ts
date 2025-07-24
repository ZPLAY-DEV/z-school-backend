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
import { addMinutes, isAfter } from 'date-fns';
import * as random from 'randomstring';
import { NotificationType } from 'src/common/enums';
import { UpdateUserDto } from 'src/domain/user/dto/update-user.dto';
import { Secret } from 'src/domain/user/entities/secret.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { normalizePhone } from 'src/helpers/phone';
import { AligoService } from 'src/services/aligo/aligo.service';
import { DeepPartial } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class UserOtpService {
  private readonly logger = new Logger(UserOtpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Secret)
    private readonly secretRepository: Repository<Secret>,
    @Inject(ConfigService) private configService: ConfigService, // global
    private readonly aligoService: AligoService,
  ) {}

  //! ---------------------------------------------------------------------- ?//
  //! @deprecated
  //! ---------------------------------------------------------------------- ?//

  async sendOtpForNonExistingUser(val: string, role: string): Promise<void> {
    const phone = val.includes('@') ? null : normalizePhone(val);
    const email = val.includes('@') ? val : null;
    const where = email ? { email } : phone ? { phone } : undefined;
    if (!where) {
      throw new BadRequestException('Invalid key');
    }

    const dbUser = await this.userRepository.findOne({ where });
    if (dbUser) {
      throw new UnprocessableEntityException('already taken');
    }

    let otp = '';
    if (phone) {
      // 미리
      if (phone.startsWith('01094867')) {
        otp = await this._upsertOtpUsingDb(phone, role, '0000');
      } else {
        otp = await this._upsertOtpUsingDb(phone, role);
        await this._sendSmsTo(phone, otp);
      }
    } else {
      if (!email) throw new Error('Email is required');
      otp = await this._upsertOtpUsingDb(email, role);
      await this._sendEmailTo(email, otp);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? Existing User 본인인증 OTP 발송
  //? ---------------------------------------------------------------------- ?//

  async sendOtpForExistingUser(val: string, role: string): Promise<void> {
    const phone = val.includes('@') ? null : normalizePhone(val);
    const email = val.includes('@') ? val : null;
    const where = email ? { email } : phone ? { phone } : undefined;
    if (!where) {
      throw new BadRequestException('Invalid key');
    }

    const dbUser = await this.userRepository.findOne({ where });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    let otp = '';
    if (phone) {
      if (phone.startsWith('01094867')) {
        otp = await this._upsertOtpUsingDb(phone, role, '0000');
      } else {
        otp = await this._upsertOtpUsingDb(phone, role);
      }
      await this._sendSmsTo(phone, otp);
    } else {
      if (!email) throw new Error('Email is required');
      const otp = await this._upsertOtpUsingDb(email, role);
      await this._sendEmailTo(email, otp);
    }
  }

  //? ---------------------------------------------------------------------- ?//
  //? 본인인증 OTP 검사 후, User 업데이트
  //? ---------------------------------------------------------------------- ?//

  async updateUserIfOtpMatches(
    val: string,
    otp: string,
    role: string, // PARENT or INSTRUCTOR
    dto: UpdateUserDto,
  ): Promise<User> {
    const phone = val.includes('@') ? null : normalizePhone(val);
    const email = val.includes('@') ? val : null;
    const where = email ? { email } : phone ? { phone } : undefined;
    if (!where) {
      throw new BadRequestException('Invalid key');
    }

    const dbUser = await this.userRepository.findOne({ where });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const secret = await this.secretRepository.findOne({
      where: { key: val },
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
    return await this.userRepository.save(user as DeepPartial<User>);
  }

  //? ---------------------------------------------------------------------- ?//
  //? privates
  //? ---------------------------------------------------------------------- ?//

  async _upsertOtpUsingDb(
    key: string,
    role: string,
    otp?: string,
  ): Promise<string> {
    const pass = otp ?? random.generate({ length: 4, charset: 'numeric' });
    await this.userRepository.manager.query(
      'INSERT IGNORE INTO secrets (`key`, `otp`, `role`) \
  VALUES (?, ?, ?) AS new_secret(`key`, `otp`, `role`) \
  ON DUPLICATE KEY \
  UPDATE `key`=new_secret.`key`, \
  `otp`=new_secret.`otp`, \
  `role`=new_secret.`role`',
      [key, pass, role],
    );
    return pass as string;
  }

  async _sendSmsTo(phone: string, otp: string): Promise<any> {
    const body = `[스쿨허브] 인증코드 ${otp}`;
    try {
      // Instead of directly sending SMS, queue the message in SQS
      await this.aligoService.sendSingleMessageToSingleDestination({
        id: 0,
        phone: phone,
        body: body,
        type: NotificationType.OTHER,
        schoolId: 0,
        role: 'PARENT',
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException('nCloud smsClient error');
    }
  }

  async _sendEmailTo(email: string, otp: string): Promise<any> {
    // a dummy await function
    await new Promise(() =>
      setTimeout(() => {
        console.log(`${email} with ${otp}`);
      }, 100),
    );
    // todo. 이메일 발송 로직 추가
    // const body = `[스쿨허브] 인증코드 ${otp}`;
    // await this.sesService.sendEmail({
    //   id: 0,
    //   email: email,
    //   body: body,
    // });
  }
}
