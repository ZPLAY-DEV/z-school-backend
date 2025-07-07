import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BookingStatus } from 'src/common/enums';
import { Offering } from 'src/domain/offering/entities/offering.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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

@Entity('bookings')
@Unique(['offeringId', 'studentId'])
export class Booking {
  @ApiProperty({ description: 'bookingId' })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  offeringId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '수강신청 과목명' })
  @Column({ type: 'varchar', length: 24, nullable: true })
  lessonName: string | null;

  @ApiProperty({ description: '최대 50위 까지의 대기순서' })
  @Column({ type: 'smallint', nullable: false, default: 0 })
  waitingPosition: number;

  @ApiProperty({ description: '수강확정 여부' })
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @ApiProperty({ description: '🈳 비고' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  // ------------------------------------------------------------------------ //

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt: Date;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Student, (student) => student.bookings)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Offering, (offering) => offering.bookings)
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Booking>) {
    Object.assign(this, partial);
  }
}
