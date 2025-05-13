import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User } from 'src/domain/user/entities/user.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Comment } from 'src/domain/board/entities/comment.entity';
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
import { BoardTarget, Role } from 'src/common/enums';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 작성자 User ID' })
  @Column({ type: 'int', unsigned: true })
  userId: number;

  @ApiProperty({ description: '🈳 Group ID' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 학교ID (relation용 아님)' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number | null; // 관리자 편의를 위한 Column.

  @ApiProperty({ description: '🈵 게시글 제목' })
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @ApiProperty({ description: '🈳 게시글 본문' })
  @Column({ type: 'text', default: null, nullable: true })
  body: string | null;

  @ApiProperty({ description: '🈳 첨부 파일 URL', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  fileUrl: string | null;

  @ApiProperty({ description: '🈵 작성자 유형', enum: Role })
  @Column({ type: 'enum', enum: Role })
  userRole: Role;

  @ApiProperty({ description: '🈵 게시글 대상 (JSON)' })
  @Column({
    type: 'enum',
    enum: BoardTarget,
  })
  target: BoardTarget;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt', nullable: true })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => User, (user: User) => user.boards)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, (group: Group) => group.boards, {
    nullable: true,
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Comment, (comment: Comment) => comment.board)
  comments: Comment[];

  // ------------------------------------------------------------------------ //

  constructor(partial: Partial<Board>) {
    Object.assign(this, partial);
  }
}
