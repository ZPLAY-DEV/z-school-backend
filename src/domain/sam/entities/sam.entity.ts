import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { SamStatus } from 'src/common/enums/sam-status';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { School } from 'src/domain/school/entities/school.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sams')
@Unique(['schoolId', 'instructorId'])
export class Sam {
  @ApiProperty({ description: 'samId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({
    description: 'exclusively exists in instructor',
    example: 1,
  })
  @Column({ type: 'int', unsigned: true })
  instructorId: number;

  @ApiProperty({
    description: 'exclusively exists in school',
    example: 1,
  })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈵 학교에서 사용하는 강사 별칭',
    example: '강사 별칭',
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: null,
    comment:
      '학교에서 사용하는 강사 별칭 instructor entity에서 복제 되거나 그대로 활용',
  })
  alias: string | null;

  @ApiProperty({
    description: '🈵 aggregated 평가점수 100점 만점',
    example: 100,
  })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  score: number;

  @ApiProperty({
    description: '🈳 교재/재료비 수정 권한 여부',
    example: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    comment: '교재/재료비 수정 권한 여부',
  })
  editFeePermission: boolean;

  @ApiProperty({
    description: '🈳 수강생 추가/취소 권한 여부',
    example: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    comment: '수강생 추가/취소 권한 여부',
  })
  editPickPermission: boolean;

  @ApiProperty({ description: '학생의 상태. 유효, 전학', example: 'ACTIVE' })
  @Column({
    type: 'enum',
    enum: SamStatus,
    default: SamStatus.ACTIVE,
  })
  status: SamStatus;

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

  //* M-to-1 belongsTo ------------------------------------------------------- *//

  @ManyToOne(() => Instructor, (instructor) => instructor.sams)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  @ManyToOne(() => School, (school) => school.sams)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Contract, (contract) => contract.sam)
  contracts: Contract[]; // 가르치는 과목관련 계약

  @OneToMany(() => Group, (group) => group.sam)
  groups: Group[]; // 담당 그룹

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Sam>) {
    Object.assign(this, partial);
  }
}

// Group with picks count interface
export interface GroupWithPicksCount extends Group {
  picksCount: number;
}
