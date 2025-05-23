import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
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
import { Instructor } from './instructor.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Payout } from 'src/domain/payout/entities/payout.entity';
import { Document } from 'src/domain/document/entities/document.entity';
@Entity('sam')
@Unique(['instructorId', 'schoolId'])
export class Sam {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  instructorId: number;

  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 학교에서 사용하는 강사 별칭' })
  @Column({
    type: 'varchar',
    length: 16,
    default: null,
    comment:
      '학교에서 사용하는 강사 별칭 instructor entity에서 복제 되거나 그대로 활용',
  })
  alias: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiProperty({ description: '🈳 내용' })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @Column({
    type: 'boolean',
    default: false,
    comment: '교재/재료비 수정 권한 여부',
  })
  @ApiProperty({ description: '🈳 교재/재료비 수정 권한 여부' })
  editFeePermission: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '수강 추가/취소 권한 여부',
  })
  @ApiProperty({ description: '🈳 수강 추가/취소 권한 여부' })
  editEnrollmentPermission: boolean;

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

  @ManyToOne(() => Instructor, (instructor) => instructor.sam)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  @ManyToOne(() => School, (school) => school.sam)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Document, (document) => document.sam)
  documents: Document[];

  @OneToMany(() => Group, (group) => group.sam)
  groups: Group[];

  @OneToMany(() => Payout, (payout) => payout.sam)
  payouts: Payout[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Sam>) {
    Object.assign(this, partial);
  }
}
