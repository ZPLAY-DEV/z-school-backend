import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { IS3Urls } from 'src/common/interfaces';
import { ChangePasswordDto } from 'src/domain/user/dto/change-password.dto';
import { ChangeUsernameDto } from 'src/domain/user/dto/change-username.dto';
import { DeleteUserDto } from 'src/domain/user/dto/delete-user.dto';
import { User } from 'src/domain/user/entities/user.entity';
import { AvatarInterceptor } from 'src/domain/user/interceptors/avatar-interceptor';
import { HashPasswordPipe } from 'src/domain/user/pipes/hash-password.pipe';
import { UniqueKeysPipe } from 'src/domain/user/pipes/unique-keys.pipe';
import { ValidateUsernamePipe } from 'src/domain/user/pipes/validate-username.pipe';
import { UploadService } from 'src/services/upload/upload.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? CREATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'User 생성' })
  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  async create(
    @Body(UniqueKeysPipe, HashPasswordPipe) dto: CreateUserDto,
  ): Promise<User> {
    return await this.userService.create(dto);
  }

  @Post(':id/notify')
  async notifyUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { title: string; message: string },
  ): Promise<void> {
    await this.userService.notifyUser(id, dto);
  }

  @Post(':id/avatar/s3urls')
  async generateS3Urls(
    @Param('id', ParseIntPipe) id: number,
    @Body('mime') mime: string,
  ): Promise<IS3Urls> {
    return await this.uploadService.generateUserAvatarUrls(id, mime);
  }

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'User 리스트 (paginated)' })
  @UseInterceptors(AvatarInterceptor)
  // @UsePipes(new ValidationPipe({ transform: true }))
  @Get('paginated')
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(@Paginate() query: PaginateQuery): Promise<Paginated<User>> {
    return this.userService.findAll(query);
  }

  @ApiOperation({ description: 'User 리스트 (User[])' })
  @Get()
  async list(): Promise<User[]> {
    return this.userService.list();
  }

  //! without ClassSerializerInterceptor, it will spit out all the user props.
  @ApiOperation({ description: '본인 User 상세보기' })
  @Get('mine')
  async getMine(@CurrentUserId() id: number): Promise<any> {
    const user = await this.userService.findById(id, [
      'parent',
      'instructor',
      'manager',
    ]);

    return user;
  }

  @ApiOperation({ description: 'User 상세보기' })
  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  async getUserById(
    @Param('id', ParseIntPipe) id: number,
    @Query('extra') extra: string[],
  ): Promise<User> {
    const defaultRelations = [
      'manager',
      'parent',
      'instructor',
      // 'followings',
      // 'followers',
    ];
    return extra && extra.length > 0
      ? await this.userService.findById(id, [...defaultRelations, ...extra])
      : await this.userService.findById(id, defaultRelations);
  }

  @ApiOperation({ description: 'find user by phone #' })
  @Public()
  @Get(':phone/phone')
  @UseInterceptors(ClassSerializerInterceptor)
  async findUserByPhone(@Param('phone') phone: string): Promise<User | null> {
    return await this.userService.findByUniqueKey({
      where: {
        phone,
      },
    });
  }

  @ApiOperation({ description: 'unique 하면 true' })
  @Get(':phone/phone/unique')
  @UseInterceptors(ClassSerializerInterceptor)
  async checkPhoneUnique(
    @CurrentUserId() id: number,
    @Param('phone') phone: string,
  ): Promise<boolean> {
    const user = await this.findUserByPhone(phone);
    if (!user) return true;
    if (user.id === id) return true;
    return false;
  }

  @ApiOperation({ description: 'find user by providerId' })
  @Public()
  @Get(':uid/uid')
  @UseInterceptors(ClassSerializerInterceptor)
  async findUserByProviderId(@Param('uid') uid: string): Promise<User> {
    return await this.userService.findByProviderId(uid);
  }

  // @ApiOperation({ description: 'initial username' })
  // @Get(':id/username')
  // getInitialUsername(@Param('id', ParseIntPipe) id: number): AnyData {
  //   return {
  //     data: initialUsername(id),
  //   };
  // }

  //? ---------------------------------------------------------------------- ?//
  //? UPDATE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'User 정보 갱신' })
  @Patch(':userId')
  async update(
    @Param('userId') userId: number,
    @Body(ValidateUsernamePipe) dto: UpdateUserDto,
  ): Promise<User> {
    return await this.userService.update(userId, dto);
  }

  @ApiOperation({ description: 'User 닉네임 갱신' })
  @Patch(':userId/username')
  async changeUsername(
    @CurrentUserId() id: number,
    @Param('userId') userId: number,
    @Body(ValidateUsernamePipe) dto: ChangeUsernameDto,
  ): Promise<User> {
    if (id !== userId) {
      throw new BadRequestException(`doh! mind your id`);
    }

    return await this.userService.changeUsername(userId, dto);
  }

  @ApiOperation({ description: 'User 비밀번호 갱신' })
  @Patch(':userId/password')
  async changePassword(
    @CurrentUserId() id: number,
    @Param('userId') userId: number,
    @Body(HashPasswordPipe) dto: ChangePasswordDto,
  ): Promise<User> {
    if (id !== userId) {
      throw new BadRequestException(`doh! mind your id`);
    }

    return await this.userService.changePassword(userId, dto);
  }

  //? ---------------------------------------------------------------------- ?//
  //? DELETE
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'User 탈퇴' })
  @Delete(':userId')
  // @UseInterceptors(ClassSerializerInterceptor)
  async remove(
    @Param('userId') userId: number,
    @Body() dto: DeleteUserDto,
  ): Promise<void> {
    return await this.userService.quit(userId, dto);
  }

  @ApiOperation({ description: 'User 아바타 이미지 삭제' })
  @Delete(':userId/image')
  async deleteImages(@Param('userId') userId: number): Promise<void> {
    await this.userService.removeAvatar(userId);
  }
}
