import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { Comment } from 'src/domain/post/entities/comment.entity';
import { Post } from 'src/domain/post/entities/post.entity';
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
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  @ApiProperty({ description: '🈵 username' })
  username: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  @ApiProperty({ description: '🈳 phone' })
  phone: string | null;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  @ApiProperty({ description: '🈳 email' })
  email: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @ApiProperty({ description: '🈵 password' })
  password: string;

  // @Column({ type: 'enum', enum: Gender, nullable: true })
  // @ApiProperty({ description: '성별' })
  // gender: Gender | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: DEFAULT_AVATAR_URL,
  })
  @ApiProperty({ description: '🈳 avatar' })
  avatar: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: '🈳 pushToken' })
  pushToken: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  @ApiProperty({ description: '🈵 createdAt' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '🈵 updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn()
  @ApiProperty({ description: '🈳 deletedAt' })
  deletedAt: Date | null;

  //* 1-to-1 hasOne -------------------------------------------------------- *//

  @OneToOne(() => Instructor, (instructor) => instructor.user, {
    cascade: ['insert', 'update'],
  })
  instructor?: Instructor;

  @OneToOne(() => Manager, (manager) => manager.user, {
    cascade: ['insert', 'update'],
  })
  manager?: Manager;

  @OneToOne(() => Parent, (parent) => parent.user, {
    cascade: ['insert', 'update'],
  })
  parent?: Parent;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Token, (token) => token.user, {
    cascade: ['insert', 'update'],
  })
  tokens: Token[];

  @OneToMany(() => Provider, (provider) => provider.user, {
    cascade: ['insert', 'update'],
  })
  providers: Provider[];

  @OneToMany(() => Post, (post) => post.user, {
    cascade: ['insert', 'update'],
  })
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user, {
    cascade: ['insert', 'update'],
  })
  comments: Comment[];

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.user)
  withdrawals: Withdrawal[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
