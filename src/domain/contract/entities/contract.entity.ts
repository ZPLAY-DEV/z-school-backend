import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contracts')
@Unique(['groupId', 'lessonId', 'samId'])
export class Contract {
  @ApiProperty({ description: 'contractId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  // 어떤 반에
  @ApiProperty({ description: 'groupId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  // 어떤 학교쌤이 선택되었는지를 저장
  @ApiProperty({ description: 'studentId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  samId: number;

  // 관리때문에 추가) 강사가 가르치는 과목 고를때 필요함
  @ApiProperty({ description: 'lessonId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  lessonId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈵 누가 수업시작일 등록했나?',
    default: null,
    example: null,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '누가 수업시작일(첫수업일) 등록했나?',
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '🈳 startedOn; 수업시작일(첫수업일)',
    example: '2025-05-27',
  })
  @Column({
    type: 'varchar',
    length: 16,
    comment: '수업시작일(첫수업일)',
  })
  startedOn: string;

  @ApiProperty({
    description: '🈳 누가 수업종료일(마지막수업일) 등록했나?',
    default: null,
    example: null,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '누가 수업종료일(마지막수업일) 등록했나?',
  })
  endedBy: Actor | null;

  @ApiProperty({
    description: '🈳 endedOn; 수업종료일(마지막수업일)',
    example: '2025-08-27',
  })
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '수업종료일(마지막수업일)',
  })
  endedOn: string | null;

  @ApiProperty({ description: '🈳 비고', example: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Sam, (sam) => sam.contracts)
  @JoinColumn({ name: 'samId' })
  sam: Sam;

  @ManyToOne(() => Group, (group) => group.contracts)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Lesson, (lesson) => lesson.contracts)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}
