import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus } from 'src/common/enums';
import { Group } from 'src/domain/group/entities/group.entity';
import { Ledger } from 'src/domain/ledger/entities/ledger.entity';
import { Parent } from 'src/domain/parent/entities/parent.entity';
import { School } from 'src/domain/school/entities/school.entity';
import { StudentGroup } from 'src/domain/student/entities/student-group.entity';
import { Subsidy } from 'src/domain/subsidy/entities/subsidy.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  // Unique,
  UpdateDateColumn,
} from 'typeorm';

//? TransferHistory (수업이동) 대신 student_group 사용
@Entity('students')
// @Unique(['name', 'parent_id'])
export class Student {
  @ApiProperty({
    description: 'student id',
  })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number; // 43억개

  // todo. 부모는 1명만 가능하다. okay?
  @ApiProperty({
    description: 'exclusively exists in parent',
  })
  @Column({ type: 'int', unsigned: true, nullable: true })
  parentId: number;

  @ApiProperty({ description: 'exclusively exists in school' })
  @Column({ type: 'int', unsigned: true, nullable: true })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: '학년' })
  @Column({ type: 'varchar', length: 8, default: `1학년` })
  grade: string;

  @ApiProperty({ description: '반' })
  @Column({ type: 'varchar', length: 8, default: `1반` })
  class: string;

  @ApiProperty({ description: '학번/번호' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  studentCode: string | null;

  @ApiProperty({ description: 'up to 16 characters' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  name: string | null;

  @ApiProperty({ description: '전화번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

  @ApiProperty({ description: '전화번호 (숫자만 입력)' })
  @Column({ type: 'varchar', length: 16, nullable: true })
  escortPhone: string | null;

  @ApiProperty({ description: 'up to 32 characters' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  homeTransit: string | null;

  @ApiProperty({ description: '' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  nextStop: string | null;

  @ApiProperty({ description: '' })
  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ATTENDING,
  })
  status: StudentStatus;

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

  @ApiProperty({ description: 'deletedAt' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  //* M-to-1 belongsTo ----------------------------------------------------- *//

  @ManyToOne(() => Parent, (parent) => parent.students)
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @ManyToOne(() => School, (school) => school.students)
  @JoinColumn({ name: 'school_id' })
  school: School;

  //* 1-to-M hasMany ------------------------------------------------------- *//

  @OneToMany(() => Subsidy, (subsidy) => subsidy.student)
  subsidies: Subsidy[];

  @OneToMany(() => Ledger, (ledger) => ledger.student)
  ledgers: Ledger[];

  //* N-to-M belongsToMany with custom props using 1-to-M ------------------ *//

  @OneToMany(() => StudentGroup, (stdGrp) => stdGrp.student)
  studentGroups: Group[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Student>) {
    Object.assign(this, partial);
  }
}
