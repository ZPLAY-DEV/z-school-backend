import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Contract } from 'src/domain/contract/entities/contract.entity';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
import { Payout } from 'src/domain/payout/entities/payout.entity';
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

  @OneToMany(() => Payout, (payout) => payout.sam)
  payouts: Payout[]; // 월급

  @OneToMany(() => Contract, (contract) => contract.sam)
  contracts: Contract[]; // 가르치는 과목

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Sam>) {
    Object.assign(this, partial);
  }
}
