import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray, IsEnum } from 'class-validator';
import { DocumentType } from 'src/common/enums';
import { Document } from 'src/domain/document/entities/document.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { Payout } from 'src/domain/payout/entities/payout.entity';
import { User } from 'src/domain/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { InstructorSchool } from './instructor-school.entity';

@Entity('instructors')
@Unique(['name', 'phone'])
export class Instructor {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 로그인 사용자ID' })
  @Column({
    type: 'int',
    unique: true,
    unsigned: true,
    default: null,
  })
  userId: number | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 강사 이름' })
  @Column({ type: 'varchar', length: 16, default: null })
  name: string;

  @ApiProperty({ description: '🈵 강사 전화번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: '🈳 pushToken' })
  pushToken: string | null;

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

  @ApiProperty({ description: '🈵 aggregated 평가점수 100점 만점' })
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  score: number;

  @ApiProperty({ description: '🈵 강사가 지금까지 업로드한 문서' })
  @Column('json', { nullable: true })
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  registeredDocuments: DocumentType[];

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈳 termsAgreedAt' })
  @Column({ type: 'datetime', nullable: true })
  termsAgreedAt: Date | null;

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

  //* 1-to-1 belongsTo ----------------------------------------------------- *//

  @OneToOne(() => User, (user) => user.instructor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user?: User;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Document, (document) => document.instructor)
  documents: Document[];

  @OneToMany(() => Group, (group) => group.instructor)
  groups: Group[];

  @OneToMany(() => Payout, (payout) => payout.instructor)
  payouts: Payout[];

  //* N-to-M belongsToMany using OneToMany --------------------------------- *//

  @OneToMany(
    () => InstructorSchool,
    (instructorSchool) => instructorSchool.instructor,
  )
  instructorSchools: InstructorSchool[];

  @OneToMany(
    () => InstructorLesson,
    (instructorLesson: InstructorLesson) => instructorLesson.instructor,
  )
  instructorLessons: InstructorLesson[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Instructor>) {
    Object.assign(this, partial);
  }
}
