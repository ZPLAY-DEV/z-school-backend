import { ApiProperty } from '@nestjs/swagger';
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
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  offeringId: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'int', unsigned: true })
  studentId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '같은 조건일때 우선 선정' })
  @Column({ default: false })
  isPreferred: boolean;

  @ApiProperty({ description: '수강확정 여부' })
  @Column({ default: false })
  isEnrolled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
