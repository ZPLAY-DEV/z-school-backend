import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from 'src/common/enums';
import { Instructor } from 'src/domain/instructor/entities/instructor.entity';
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

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  instructorId: number;

  @Column({
    type: 'int',
    unsigned: true,
    default: null,
    nullable: true,
    comment:
      '학교 ID - 강사가 학교에 제출하는 서류를 관리하기 위해서 schoolId를 관계 맵핑 없이 nullable로 지정',
  })
  schoolId: number;

  // ------------------------------------------------------------------------ //

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.RESUME,
  })
  documentType: DocumentType;

  @Column({ length: 255 })
  url: string;

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

  @ManyToOne(() => Instructor, (instructor) => instructor.documents)
  @JoinColumn({ name: 'instructorId' })
  instructor: Instructor;

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Document>) {
    Object.assign(this, partial);
  }
}
