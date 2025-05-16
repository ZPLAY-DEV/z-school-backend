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
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Instructor } from './instructor.entity';

@Entity('instructor_school')
@Unique(['instructorId', 'schoolId'])
export class InstructorSchool {
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
  alias: string;

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

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @ManyToOne(() => Instructor, (instructor) => instructor.instructorSchools)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  @ManyToOne(() => School, (school) => school.instructorSchools)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<InstructorSchool>) {
    Object.assign(this, partial);
  }
}
