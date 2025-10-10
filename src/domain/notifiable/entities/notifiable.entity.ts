import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    NotifiableSourceType,
    NotifiableTarget,
    SendStatus,
} from 'src/common/enums';
import { Newsletter } from 'src/domain/newsletter/entities/newsletter.entity';
import { Recipient } from 'src/domain/notifiable/entities/recipient.entity';
import { Reminder } from 'src/domain/reminder/entities/reminder.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { Survey } from 'src/domain/survey/entities/survey.entity';
import { Term } from 'src/domain/term/entities/term.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('notifiables')
@Index(['schoolId', 'termId'])
export class Notifiable {
  @ApiProperty({ description: 'primary key', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈵 SchoolId' })
  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  @ApiProperty({ description: '🈵 TermId' })
  @Column({ type: 'int', unsigned: true })
  termId: number;

  // ------------------------------------------------------------------------ //
  // Polymorphic Association
  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '발송 원천 타입 (Newsletter, Reminder, Survey)',
    example: NotifiableSourceType.NEWSLETTER,
  })
  @Column({
    type: 'enum',
    enum: NotifiableSourceType,
    comment: '발송 원천 타입',
  })
  type: NotifiableSourceType;

  // ------------------------------------------------------------------------ //
  // Content
  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 알림 제목', example: '새로운 공지사항' })
  @Column({ type: 'varchar', length: 128 })
  title: string;

  @ApiProperty({
    description: '🈵 알림 메시지',
    example: '공지사항을 확인해주세요.',
  })
  @Column({ type: 'text' })
  message: string;

  // ------------------------------------------------------------------------ //
  // 언제
  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈳 발송예약 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '발송예약 시각' })
  scheduledAt: Date | null;

  @ApiProperty({
    description: '🈳 실제 발송 시각 (YYYY-MM-DD HH:mm:ss)',
    example: '2025-06-26T00:30:00Z',
  })
  @Column({ type: 'timestamp', nullable: true, comment: '실제 발송 시각' })
  sentAt: Date | null;

  @ApiProperty({ description: '🈵 발송 상태' })
  @Column({
    type: 'enum',
    enum: SendStatus,
    default: SendStatus.INIT,
  })
  status: SendStatus;

  // ------------------------------------------------------------------------ //
  // 대상
  // ------------------------------------------------------------------------ //

  @ApiProperty({
    description: '🈵 발송대상자 리스트. 발송하려면 deduped studentIds 필요',
    example: [1, 2, 3],
  })
  @Column({
    type: 'simple-array',
    comment: '발송대상자 리스트. 발송하려면 deduped studentIds 필요',
    nullable: true,
  })
  @Transform(({ value }) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return value.map((id: string | number) =>
        typeof id === 'string' ? parseInt(id, 10) : id,
      );
    }
    return value as number[] | null;
  })
  studentIds: number[] | null;

  @ApiProperty({
    description: '🈵 발송 대상 유형; SCHOOL, GRADE, LESSON, GROUP, STUDENT',
    example: NotifiableTarget.SCHOOL,
  })
  @Column({
    type: 'enum',
    enum: NotifiableTarget,
    default: NotifiableTarget.SCHOOL,
    nullable: true,
  })
  target: NotifiableTarget | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({
    type: 'simple-array',
    comment: '대상별 아이템 아이디',
    nullable: true,
  })
  @Transform(({ value }) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      return value.map((id: string | number) =>
        typeof id === 'string' ? parseInt(id, 10) : id,
      );
    }
    return value as number[] | null;
  })
  targetItems: number[] | null;

  @ApiProperty({ description: '🈵 발송 대상 유형' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  targetLabel: string | null;

  // ------------------------------------------------------------------------ //
  // Timestamps
  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '🈵 createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '🈵 updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: '🈳 deletedAt', nullable: true })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school: School) => school.notifiables)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @ManyToOne(() => Term, (term: Term) => term.notifiables)
  @JoinColumn({ name: 'termId' })
  term: Term;

  //* 1-to-1 belongsTo (역관계) -------------------------------------------- *//

  @OneToOne(() => Newsletter, (newsletter) => newsletter.notifiable, {
    nullable: true,
  })
  newsletter: Newsletter | null;

  @OneToOne(() => Survey, (survey) => survey.notifiable, {
    nullable: true,
  })
  survey: Survey | null;

  @OneToOne(() => Reminder, (reminder) => reminder.notifiable, {
    nullable: true,
  })
  reminder: Reminder | null;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Recipient, (recipient) => recipient.notifiable, {
    cascade: ['insert', 'update'],
  })
  recipients: Recipient[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Notifiable>) {
    Object.assign(this, partial);
  }
}
