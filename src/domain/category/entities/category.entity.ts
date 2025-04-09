import { ApiProperty } from '@nestjs/swagger';
import { Category as CategoryEnum } from 'src/common/enums';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ApiProperty({ description: '분류' })
  @Column({
    type: 'enum',
    enum: CategoryEnum,
    default: CategoryEnum.FREE_CUSTOM,
  })
  slug: CategoryEnum;

  @ApiProperty({ description: 'name' })
  @Column({ length: 32 })
  name: string;

  @ApiProperty({ description: 'total count' })
  @Column({ type: 'int', unsigned: true, default: 0 })
  count: number;

  // ------------------------------------------------------------------------ //

  @ApiProperty({ description: 'createdAt' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'updatedAt' })
  @UpdateDateColumn()
  updatedAt: Date;

  //* N-to-M belongsToMany ------------------------------------------------- *//

  @ManyToMany(() => Lesson, (lesson) => lesson.categories)
  @JoinTable({
    name: 'category_lesson',
    joinColumn: {
      name: 'categoryId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'lessonId',
      referencedColumnName: 'id',
    },
  })
  public lessons: Lesson[];

  //? Constructor ---------------------------------------------------------- ?//

  constructor(partial: Partial<Category>) {
    Object.assign(this, partial);
  }
}
