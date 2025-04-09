import { ApiProperty } from '@nestjs/swagger';
import { CalendarType } from 'src/common/enums';
import { School } from 'src/domain/school/entities/school.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('calendars')
@Unique(['schoolId', 'date'])
export class Calendar {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '휴일/행사일 이름' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null; // 관리자 편의를 위한 column

  @ApiProperty({ description: 'ISO 형식의 날짜 문자열 (YYYY-MM-DD)' })
  @Column({ type: 'varchar', length: 10 })
  date: string; // "2025-08-14" 형식으로 저장

  @ApiProperty({ description: '' })
  @Column({
    type: 'enum',
    enum: CalendarType,
    default: CalendarType.HOLIDAY,
  })
  status: CalendarType;

  @ApiProperty({ description: '비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => School, (school) => school.calendars, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  //? 날짜 문자열을 Date 객체로 변환하는 getter ----------------------------------- ?//

  get dateAsDate(): Date {
    return new Date(`${this.date}T09:00:00+09:00`); // UTC +9 시간대로 변환
  }

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Calendar>) {
    Object.assign(this, partial);
  }
}
