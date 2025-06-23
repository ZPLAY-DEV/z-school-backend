import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { Board } from 'src/domain/board/entities/board.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Provider } from 'src/domain/user/entities/provider.entity';
import { Token } from 'src/domain/user/entities/token.entity';
import { Withdrawal } from 'src/domain/user/entities/withdrawal.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @ApiProperty({ description: 'userId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 username' })
  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @ApiProperty({ description: '🈳 phone' })
  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  phone: string | null;

  @ApiProperty({ description: '🈳 email' })
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  email: string | null;

  @Exclude()
  @ApiProperty({ description: '🈵 password' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  password: string;

  // @Column({ type: 'enum', enum: Gender, nullable: true })
  // @ApiProperty({ description: '성별' })
  // gender: Gender | null;

  @ApiProperty({ description: '🈳 avatar' })
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: DEFAULT_AVATAR_URL,
  })
  avatar: string | null;

  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: '🈳 pushToken' })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  pushToken: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @Exclude()
  @OneToOne(() => Instructor, (instructor) => instructor.user, {
    cascade: ['insert', 'update'],
  })
  instructor?: Instructor;

  @Exclude()
  @OneToOne(() => Manager, (manager) => manager.user, {
    cascade: ['insert', 'update'],
  })
  manager?: Manager;

  @Exclude()
  @OneToOne(() => Parent, (parent) => parent.user, {
    cascade: ['insert', 'update'],
  })
  parent?: Parent;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @Exclude()
  @OneToMany(() => Token, (token) => token.user, {
    cascade: ['insert', 'update'],
  })
  tokens: Token[];

  @Exclude()
  @OneToMany(() => Provider, (provider) => provider.user, {
    cascade: ['insert', 'update'],
  })
  providers: Provider[];

  // @Exclude()
  // @OneToMany(() => Post, (post) => post.user, {
  //   cascade: ['insert', 'update'],
  // })
  // posts: Post[];

  @Exclude()
  @OneToMany(() => Board, (board) => board.user, {
    cascade: ['insert', 'update'],
  })
  boards: Board[];

  @Exclude()
  @OneToMany(() => Comment, (comment) => comment.user, {
    cascade: ['insert', 'update'],
  })
  comments: Comment[];

  @Exclude()
  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.user)
  withdrawals: Withdrawal[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
