import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('picks')
@Unique(['groupId', 'studentId'])
export class Pick {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '학생 아이디' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '그룹 아이디' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  @ApiProperty({ description: '수강신청과목 아이디' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  offeringId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '이 학생의 정확한 교재비', example: 12000 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  bookFee: number;

  @ApiProperty({ description: '이 학생의 정확한 재료비', example: 8200 })
  @Column({ type: 'int', unsigned: true, default: 0 })
  materialFee: number;

  @ApiProperty({
    description: '🈵 누가 수업시작일 등록했나?',
    default: Actor.SYSTEM,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '누가 수업시작일 등록했나?',
  })
  startedBy: Actor | null;

  @ApiProperty({ description: '🈳 startedOn; 수업시작일(첫수업일)' })
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '수업시작일(첫수업일)',
  })
  startedOn: string | null;

  @ApiProperty({ description: '🈳 누가 수업종료일(마지막수업일) 등록했나?' })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '누가 수업종료일(마지막수업일) 등록했나?',
  })
  endedBy: Actor | null;

  @ApiProperty({ description: '🈳 endedOn; 수업종료일(마지막수업일)' })
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: '수업종료일(마지막수업일)',
  })
  endedOn: string | null;

  @ApiProperty({ description: '🈳 비고' })
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

  @ManyToOne(() => Student, (student) => student.groupStudents)
  student: Student;

  @ManyToOne(() => Group, (group) => group.groupStudents)
  group: Group;
}
