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
@Unique(['studentId', 'groupId', 'offeringId'])
export class Pick {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  @ApiProperty({ description: '학생 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  studentId: number;

  @ApiProperty({ description: '그룹 아이디', example: 1 })
  @Column({ type: 'int', unsigned: true, nullable: true })
  groupId: number;

  @ApiProperty({ description: '수강신청과목 아이디', example: 1 })
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
    example: Actor.SYSTEM,
  })
  @Column({
    type: 'enum',
    enum: Actor,
    default: Actor.SYSTEM,
    comment: '누가 수업시작일 등록했나?',
  })
  startedBy: Actor;

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
    example: Actor.INSTRUCTOR,
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

  @ManyToOne(() => Offering, (offering) => offering.picks)
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Student, (student) => student.picks)
  student: Student;

  @ManyToOne(() => Group, (group) => group.picks)
  group: Group;
}
