import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { ClassStatus, DocumentType } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { Group } from 'src/domain/group/entities/group.entity';
import { Ledger } from 'src/domain/ledger/entities/ledger.entity';
import { FeeItemDto } from 'src/domain/lesson/dto/fee-item.dto';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { SamLesson } from 'src/domain/sam/entities/sam-lesson.entity';
import { Term } from 'src/domain/term/entities/term.entity';
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

@Entity('lessons')
@Unique(['termId', 'schoolId', 'lessonName'])
export class Lesson {
  @ApiProperty({ description: '🈵 lessonId', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 termId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  @ApiProperty({ description: '🈵 categoryId', example: 1 })
  @Column({ type: 'int', unsigned: true })
  categoryId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 학교ID (relation용 아님)', example: 1 })
  @Column({ type: 'int', unsigned: true })
  schoolId: number; // 관리자 편의를 위한 Column.

  @ApiProperty({
    description: '🈳 학교명',
    example: '홍익대학교 사범대학 부속 초등학교',
  })
  @Column({ type: 'varchar', length: 24, nullable: true })
  schoolName: string | null; // 관리자 편의를 위한 Column.

  @ApiProperty({ description: '🈵 과목명', example: '수학' })
  @Column({ type: 'varchar', length: 24 })
  lessonName: string;

  @ApiProperty({ description: '🈳 과목설명', example: 'optional 설명내용' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @Column({ type: 'varchar', length: 10 })
  start: string;

  @ApiProperty({
    description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)',
    example: '2025-02-01',
  })
  @Column({ type: 'varchar', length: 10 })
  end: string;

  @ApiProperty({ description: 'weekly frequency' })
  @Column({
    type: 'tinyint',
    unsigned: true,
    default: 1,
    comment: 'weekly frequency',
  })
  frequency: number;

  // ------------------------------------------------------------------------ //

  // todo: 어떻게 finalizing 할 지 나중에 결정할 것
  @ApiProperty({ description: '🈵 수업료 합계 (A+B+C+D)' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  total: number;

  @ApiProperty({ description: '🈵 A. 강사비' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  instructorFee: number;

  @ApiProperty({
    description: '🈳 B. 도서구매비 배열(낮은가격순 정렬)',
    example: [{ name: 'total', amount: 1000 }],
  })
  @Column('json', { nullable: true })
  bookFees: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈳 C. 재료구매비 배열(낮은가격순 정렬)',
    example: [{ name: 'total', amount: 1000 }],
  })
  @Column('json', { nullable: true })
  materialFees: FeeItemDto[] | null;

  @ApiProperty({
    description: '🈵 D. 수용비; 학교시설 이용경비',
    example: 1000,
  })
  @Column({ type: 'int', unsigned: true, default: 0 })
  operationFee: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈵 CO-xxx 변경없이 동일비용 적용, MC/MF 비율로 계산',
    example: 'CO-1000',
  })
  @Column({ type: 'varchar', length: 16, default: 'CO-1000' })
  operationFeeRule: string | null; // 과목별로 다른 계산룰이 적용되는 경우를 위해 추가

  @ApiProperty({
    description: '🈳 필요한 문서의 Key 값들; Source of Truth',
    example: [DocumentType.RESUME],
  })
  @Column('json', { nullable: true })
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  @IsOptional()
  requiredDocuments: DocumentType[] | null;

  @ApiProperty({ description: '🈳 비고', example: 'optional 비고내용' })
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

  @ApiProperty({ description: '🈳 deletedAt', example: null })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Term, (term) => term.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'termId' })
  term: Term;

  @ApiProperty({
    description: '관련 category',
    type: Category,
    example: {
      id: 1,
      slug: 'FREE_CUSTOM',
      name: '늘봄맞춤무료',
      count: 0,
      createdAt: '2025-05-23T08:13:35.112Z',
      updatedAt: '2025-05-23T08:13:35.112Z',
    },
  })
  @ManyToOne(() => Category, (category) => category.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @ApiProperty({
    description: '관련 groups',
    type: [Group],
    isArray: true,
    example: [
      {
        id: 1,
        samId: 1,
        lessonId: 1,
        groupName: '바이올린:화요일A반',
        location: '과학실2',
        capacity: 10,
        allowedGrades: '1,2',
        weekday: '화',
        start: '13:50',
        end: '14:30',
        status: 'PENDING',
        tuition: 0,
        bookFee: 0,
        materialFee: 0,
        days: 18,
        deletedBy: null,
        note: null,
        createdAt: '2025-05-23T08:43:26.709Z',
        updatedAt: '2025-05-26T02:28:19.000Z',
        sam: {
          id: 1,
          instructorId: 1,
          schoolId: 1,
          alias: '김사과',
          score: 0,
          editFeePermission: false,
          editEnrollmentPermission: false,
          note: null,
          createdAt: '2025-05-23T08:31:12.233Z',
          updatedAt: '2025-05-23T08:31:12.233Z',
        },
      },
    ],
  })
  @OneToMany(() => Group, (group) => group.lesson)
  public groups: Group[];

  @OneToMany(() => Offering, (offering) => offering.lesson)
  public offerings: Offering[];

  @OneToMany(() => Ledger, (ledger) => ledger.lesson)
  public ledgers: Ledger[];

  //* N-to-M belongsToMany using 1-to-M ------------------------------------ *//

  @ApiProperty({
    description: '관련 samLessons',
    type: [SamLesson],
    isArray: true,
    example: [
      {
        id: 22,
        instructorId: 9,
        lessonId: 21,
        createdAt: '2025-05-16T02:34:15.441Z',
        updatedAt: '2025-05-16T02:34:15.441Z',
        instructor: {
          id: 9,
          userId: null,
          name: '미확정',
          phone: '01000000007',
          score: 0,
          registeredDocuments: null,
          termsAgreedAt: null,
          createdAt: '2025-05-16T02:34:15.437Z',
          updatedAt: '2025-05-16T02:34:15.437Z',
        },
      },
    ],
  })
  @OneToMany(() => SamLesson, (samLesson: SamLesson) => samLesson.lesson)
  samLessons: SamLesson[];

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
