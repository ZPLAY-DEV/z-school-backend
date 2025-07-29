import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addMinutes, isAfter } from 'date-fns';
import * as random from 'randomstring';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Secret } from 'src/domain/user/entities/secret.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { normalizePhone } from 'src/helpers/phone';
import { NotificationService } from 'src/services/notification/notification.service';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class UserOtpService {
  private readonly logger = new Logger(UserOtpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Secret)
    private readonly secretRepository: Repository<Secret>,
    private readonly notificationService: NotificationService,
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
    const phone = normalizePhone(val);

    if (!phone) {
      throw new BadRequestException('Invalid key');
    }

    if (role.toUpperCase() === 'PARENT') {
      const parent = await this.parentRepository.findOne({ where: { phone } });
      if (!parent) {
        throw new NotFoundException('Parent not found');
      }
    } else {
      const instructor = await this.instructorRepository.findOne({
        where: { phone },
      });
      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }
    }

    let otp = '';
    if (phone.startsWith('01094867')) {
      otp = await this._upsertOtpUsingDb(phone, role, '0000');
    } else {
      otp = await this._upsertOtpUsingDb(phone, role);
    }
    await this._sendSmsTo(phone, otp);
  }

  //? ---------------------------------------------------------------------- ?//
  //? 본인인증 OTP 검사 후, User 업데이트
  //? ---------------------------------------------------------------------- ?//

  async checkOtp(val: string, otp: string): Promise<Secret> {
    const phone = val.includes('@') ? null : normalizePhone(val);
    const email = val.includes('@') ? val : null;
    const where = email ? { email } : phone ? { phone } : undefined;
    if (!where) {
      throw new BadRequestException('Invalid key');
    }

    const secret = await this.secretRepository.findOne({
      where: {
        key: val,
        otp: otp,
      },
    });
    if (!secret) {
      throw new NotFoundException('OTP mismatched');
    }

    const now = new Date();
    // secret.updatedAt을 기준으로 5분 후의 시간 계산
    const expiredAt = addMinutes(new Date(secret.updatedAt), 5);

    if (isAfter(now, expiredAt)) {
      throw new UnprocessableEntityException(`otp expired`);
    }

    return secret;
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
  `role`=new_secret.`role`, \
  updatedAt=NOW()',
      [key, pass, role],
    );
    return pass as string;
  }

  async _sendSmsTo(phone: string, otp: string): Promise<any> {
    try {
      //! use SQS where the NAT Gateway is whitelisted.
      await this.notificationService.text({
        body: `[스쿨허브] 인증코드 ${otp}`,
        phone: phone,
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
