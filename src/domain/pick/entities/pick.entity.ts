import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Actor } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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

@Entity('picks')
@Unique(['groupId', 'studentId'])
export class Pick {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  // 어떤 반에
  @ApiProperty({ description: 'groupId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  // 어떤 학생이 선택되었는지를 저장
  @ApiProperty({ description: 'studentId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  // 관리때문에 추가) 재수강생 고를때, 수강신청과목 리스트 pick 여부 확인에 필요함
  @ApiProperty({ description: 'offeringId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  offeringId: number;

  // a clear way to know which group belongs to which term
  @ApiProperty({ description: 'termId', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈳 메타정보: 가장 최근 JOIN 등록자',
    default: null,
    example: null,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '메타정보: 가장 최근 JOIN 등록자',
  })
  startedBy: Actor | null;

  @ApiProperty({
    description: '🈳 메타정보: 가장 최근 JOIN 일자',
    example: '2025-05-27',
  })
  @Column({
    type: 'date',
    default: null,
    nullable: true,
    comment: '수업시작일(첫수업일)',
  })
  start: string;

  @ApiProperty({
    description: '🈳 메타정보: 가장 최근 CANCEL 등록자',
    default: null,
    example: null,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: null,
    nullable: true,
    comment: '메타정보: 가장 최근 CANCEL 등록자',
  })
  endedBy: Actor | null;

  @ApiProperty({
    description: '🈳 메타정보: 가장 최근 CANCEL 일자',
    example: '2025-08-27',
  })
  @Column({
    type: 'date',
    default: null,
    nullable: true,
    comment: '메타정보: 가장 최근 CANCEL 일자',
  })
  end: string;

  @ApiProperty({ description: '🈵 수강여부' })
  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @ApiProperty({ description: '🈳 비고', example: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // 합류/취소 이벤트 히스토리 누적
  @Column({ type: 'json', nullable: true })
  history: {
    date: string;
    event: 'JOIN' | 'CANCEL';
    by: 'MANAGER' | 'INSTRUCTOR' | 'OTHER';
  }[];

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

  @ManyToOne(() => Offering, (offering) => offering.picks)
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  @ManyToOne(() => Student, (student) => student.picks)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Group, (group) => group.picks)
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
