import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/common/enums';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

//! 같은 role 로 다중 디바이스 로그인 허용하기 때문에 테이블 크기가 커질 수 있음
@Entity('tokens')
@Unique(['userId', 'role', 'partialToken'])
export class Token {
  @ApiProperty({ description: 'UUID token ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'user ID' })
  @Column({ type: 'int', unsigned: true })
  userId: number;

  @ApiProperty({ description: '🈵 role' })
  @Column({
    type: 'enum',
    enum: Role,
    default: Role.PARENT,
  })
  role: Role;

  @ApiProperty({ description: '🈵 Hashed refresh token' })
  @Column({ type: 'varchar', length: 64 })
  hashedToken: string;

  @ApiProperty({ description: 'Partial refresh token' })
  @Column({ type: 'varchar', length: 64 })
  partialToken: string;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '토큰 만료 시간' })
  @Column({ type: 'timestamp', comment: '토큰 만료 시간' })
  expiresAt: Date;

  @CreateDateColumn()
  @ApiProperty({ description: '🈵 createdAt' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '🈵 updatedAt' })
  updatedAt: Date;

  //* ---------------------------------------------------------------------- *//
  //* many-to-1 belongsTo

  @ManyToOne(() => User, (user) => user.tokens)
  user: User;
}
