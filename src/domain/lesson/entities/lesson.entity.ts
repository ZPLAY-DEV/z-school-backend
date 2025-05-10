import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { ClassStatus, DocumentType, EnrollmentRule } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { InstructorLesson } from 'src/domain/instructor/entities/instructor-lesson.entity';
import { Ledger } from 'src/domain/ledger/entities/ledger.entity';
import { FeeItemDto } from 'src/domain/lesson/dto/fee-item.dto';
import { Term } from 'src/domain/term/entities/term.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lessons')
@Unique(['termId', 'schoolId', 'lessonName'])
export class Lesson {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 학기ID' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 학교ID (relation용 아님)' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number; // 관리자 편의를 위한 Column.

  @ApiProperty({ description: '🈳 학교명' })
  @Column({ type: 'varchar', length: 24, nullable: true })
  schoolName: string | null; // 관리자 편의를 위한 Column.

  @ApiProperty({ description: '🈵 과목명' })
  @Column({ type: 'varchar', length: 24 })
  lessonName: string;

  @ApiProperty({ description: '🈳 과목설명' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ApiProperty({ description: '🈵 수업수/term' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  termlyLessonCount: number;

  @ApiProperty({ description: '🈵 수업수/week' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  weeklyLessonCount: number;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  start: string;

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  end: string;

  // todo: 어떻게 finalizing 할 지 나중에 결정할 것
  @ApiProperty({ description: '🈵 수업료 합계 (A+B+C+D)' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  total: number;

  @ApiProperty({ description: '🈵 A. 강사비' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  instructorFee: number;

  @ApiProperty({ description: '🈳 B. 도서구매비 배열(낮은가격순 정렬)' })
  @Column('json', { nullable: true })
  bookFees: FeeItemDto[] | null;

  @ApiProperty({ description: '🈳 C. 재료구매비 배열(낮은가격순 정렬)' })
  @Column('json', { nullable: true })
  materialFees: FeeItemDto[] | null;

  // todo: 어떻게 finalizing 할 지 나중에 결정할 것
  @ApiProperty({ description: '🈵 D. 수용비; 학교시설 이용경비' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  operationFee: number;

  @ApiProperty({
    description: '🈵 CO-xxx 변경없이 동일비용 적용, MC/MF 비율로 계산',
  })
  @Column({ type: 'varchar', length: 16, default: 'CO-1000' })
  operationFeeRule: string | null; // 과목별로 다른 계산룰이 적용되는 경우를 위해 추가

  @ApiProperty({ description: '🈵 수강신청시 시간 겹쳐도 okay?' })
  @Column({ type: 'boolean', default: false })
  allowTimeOverlap: boolean;

  @ApiProperty({ description: '🈵 분류' })
  @Column({
    type: 'enum',
    enum: EnrollmentRule,
    default: EnrollmentRule.FIRST,
  })
  enrollmentRule: EnrollmentRule;

  @ApiProperty({ description: '🈳 필요한 문서의 Key 값들; Source of Truth' })
  @Column('json', { nullable: true })
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  @IsOptional()
  requiredDocuments: DocumentType[] | null;

  @ApiProperty({ description: '🈳 비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @ApiProperty({ description: '🈵 상태' })
  @Column({ type: 'enum', enum: ClassStatus, default: ClassStatus.PENDING })
  status: ClassStatus;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Term, (term) => term.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Group, (group) => group.lesson)
  public groups: Group[];

  @OneToMany(() => Ledger, (ledger) => ledger.lesson)
  public ledgers: Ledger[];

  //* N-to-M belongsToMany using 1-to-M ------------------------------------ *//

  @OneToMany(
    () => InstructorLesson,
    (instructorLesson: InstructorLesson) => instructorLesson.lesson,
  )
  instructorLessons: InstructorLesson[];

  @ManyToMany(() => Category, (category) => category.lessons)
  categories: Category[];

  //? 날짜 문자열을 Date 객체로 변환하는 getter ----------------------------------- ?//

  get startDate(): Date {
    return new Date(`${this.start}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  get endDate(): Date {
    return new Date(`${this.end}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Lesson>) {
    Object.assign(this, partial);
  }
}
