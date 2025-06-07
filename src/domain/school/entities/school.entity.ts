import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsArray, IsEnum, IsString } from 'class-validator';
import { Permission, Region } from 'src/common/enums';
import { MessageType } from 'src/common/enums/message-type';
import { Board } from 'src/domain/board/entities/board.entity';
import { Calendar } from 'src/domain/calendar/entities/calendar.entity';
import { Manager } from 'src/domain/manager/entities/manager.entity';
import { Phone } from 'src/domain/phone/entities/phone.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Statement } from 'src/domain/statement/entities/statement.entity';
import { Student } from 'src/domain/student/entities/student.entity';
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
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '🈳 학교 이름' })
  @Column({ type: 'varchar', length: 32, nullable: true, comment: '학교 이름' })
  @IsString()
  name: string | null;

  @ApiProperty({ description: '🈵 학교 코드' })
  @Column({
    type: 'varchar',
    length: 16,
    unique: true,
    comment: '학교 코드',
  })
  schoolCode: string;

  @ApiProperty({
    description:
      '🈵 학교 전화. 학교 > phones 의 isActive 설정할때 동일번호로 설정.',
  })
  @Column({
    type: 'varchar',
    length: 16,
    unique: true,
    comment: '학교 전화',
    nullable: true,
  })
  phone: string;

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

  // @ApiProperty({ description: '🈳 문자메시지 발송번호 (숫자만 입력)' })
  // @Column({ type: 'varchar', length: 16, nullable: true })
  // phone: string;

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
  @Column({ type: 'json', comment: '학교에서 허용하는 기본 권한 리스트' })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiProperty({ description: '🈵 promo video urls' })
  @Column('json')
  @IsArray()
  @IsString({ each: true })
  promos: string[];

  @ApiProperty({ description: '🈵 메시지 타입' })
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.ALL,
  })
  messageType: MessageType;

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
  public terms: Term[];

  @OneToMany(() => Statement, (statement) => statement.school, {
    cascade: ['insert', 'update'],
  })
  public statements: Statement[];

  @OneToMany(() => Student, (student) => student.school, {
    cascade: ['insert', 'update'],
  })
  public students: Student[];

  @OneToMany(() => Manager, (manager) => manager.school, {
    cascade: ['insert', 'update'],
  })
  public managers: Manager[];

  @OneToMany(() => Calendar, (calendar) => calendar.school)
  public calendars: Calendar[];

  @OneToMany(() => Phone, (phone) => phone.school)
  public phones: Phone[];

  @OneToMany(() => Board, (board) => board.school)
  public boards: Board[];

  @OneToMany(() => Sam, (sam) => sam.school, {
    cascade: ['insert', 'update'],
  })
  public sams: Sam[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<School>) {
    Object.assign(this, partial);
    this.permissions = partial?.permissions || [];
    this.promos = partial?.promos || [];
  }
}
