import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { PostCategory } from 'src/common/enums';
import { Comment } from 'src/domain/post/entities/comment.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  userId: number | null;

  @Column({ type: 'enum', enum: PostCategory })
  @ApiProperty({ description: '종류' })
  category: PostCategory;

  @Column({ length: 64 })
  title: string;

  @Column({ type: 'text', default: null, nullable: true })
  body: string;

  @Column('json', { nullable: true })
  @ApiProperty({ description: '이미지들' })
  @IsArray()
  images: string[] | null;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => User, (user) => user.posts)
  user: User;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}
