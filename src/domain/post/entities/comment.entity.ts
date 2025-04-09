import { ApiProperty } from '@nestjs/swagger';
import { Post } from 'src/domain/post/entities/post.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  userId: number;

  @Column({ type: 'int', unsigned: true })
  postId: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  parentId: number | null;

  // ------------------------------------------------------------------------ //

  @Column({ length: 255 })
  @ApiProperty({ description: '내용' })
  body: string;

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

  @ManyToOne(() => User, (user) => user.comments)
  user: User;

  @ManyToOne(() => Post, (post) => post.comments)
  post: Post;

  //* 1-to-M hasMany (self recursive relations) ---------------------------- *//
  // ref) https://stackoverflow.com/threads/67385016/getting-data-in-self-referencing-relation-with-typeorm

  @ManyToOne(() => Comment, (Comment) => Comment.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Comment;

  @OneToMany(() => Comment, (opinion) => opinion.parent)
  children: Comment[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}
