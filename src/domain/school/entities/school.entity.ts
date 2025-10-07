import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray, IsEnum, IsString } from 'class-validator';
import { Permission, Region } from 'src/common/enums';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Affiliation } from 'src/domain/manager/entities/affiliation.entity';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Statement } from 'src/domain/statement/entities/statement.entity';
import { Student } from 'src/domain/student/entities/student.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('schools')
export class School {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 학교 이름' })
  @Column({ type: 'varchar', length: 24, comment: '학교 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '🈵 학교 전화' })
  @Column({
    type: 'varchar',
    length: 16,
    unique: true,
    comment: '학교 전화',
    nullable: true,
  })
  phone: string;

  @ApiProperty({ description: '🈵 학교 코드' })
  @Column({
    type: 'varchar',
    length: 16,
    unique: true,
    comment: '학교 코드',
  })
  schoolCode: string;

  @ApiProperty({ description: '🈵 관할 교육청 코드' })
  @Column({
    type: 'varchar',
    length: 16,
    comment: '관할 교육청 코드',
  })
  authorityCode: string;

  @ApiProperty({ description: '🈵 지역' })
  @Column({
    type: 'enum',
    enum: Region,
    default: Region.SEOUL,
  })
  region: Region;

  @ApiProperty({ description: '🈳 주소' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  address: string | null;

  @ApiProperty({
    description: '🈵 CO 변경없이 동일비용 적용, MC/MF 비율로 계산',
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: 'CO-1000',
    comment: 'CO 변경없이 동일비용 적용, MC/MF 비율로 계산',
  })
  operationFeeRule: string | null;

  @ApiProperty({ description: '🈵 percentage' })
  @Column({ type: 'tinyint', unsigned: true, default: 100 })
  payoutRate: number;

  @ApiProperty({
    description: '🈵 학교에서 허용하는 기본 권한 리스트',
    example: [Permission.ALLOW_INSTRUCTOR_ADD_STUDENT],
  })
  @Column({ type: 'json', default: null })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[] | null;

  @ApiProperty({ description: '🈵 promo video urls' })
  @Column({ type: 'json', default: null })
  @IsArray()
  @IsString({ each: true })
  promos: string[] | null;

  @ApiProperty({ description: '🈵 절약모드 여부' })
  @Column({
    type: 'boolean',
    default: false,
  })
  isFrugal: boolean;

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

  @OneToMany(() => Term, (term) => term.school, {
    cascade: ['insert', 'update'],
  })
  terms: Term[];

  @OneToMany(() => Lesson, (lesson) => lesson.school, {
    cascade: ['insert', 'update'],
  })
  lessons: Lesson[];

  @OneToMany(() => Offering, (offering) => offering.school, {
    cascade: ['insert', 'update'],
  })
  offerings: Offering[];

  @OneToMany(() => Newsletter, (newsletter) => newsletter.school, {
    cascade: ['insert', 'update'],
  })
  newsletters: Newsletter[];

  @OneToMany(() => Survey, (survey) => survey.school, {
    cascade: ['insert', 'update'],
  })
  surveys: Survey[];

  @OneToMany(() => Student, (student) => student.school, {
    cascade: ['insert', 'update'],
  })
  students: Student[];

  @OneToMany(() => Affiliation, (affiliation) => affiliation.school, {
    cascade: ['insert', 'update'],
  })
  affiliations: Affiliation[];

  @OneToMany(() => Sam, (sam) => sam.school, {
    cascade: ['insert', 'update'],
  })
  sams: Sam[];

  @OneToMany(() => Calendar, (calendar) => calendar.school)
  calendars: Calendar[];

  @OneToMany(() => Statement, (statement) => statement.school, {
    cascade: ['insert', 'update'],
  })
  statements: Statement[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<School>) {
    Object.assign(this, partial);
    this.permissions = partial?.permissions || [];
    this.promos = partial?.promos || [];
  }
}
