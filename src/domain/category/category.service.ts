import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    FilterOperator,
    paginate,
    Paginated,
    PaginateQuery,
} from 'nestjs-paginate';
import { Category as CategoryEnum, CategoryLabels } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  async list(slug: CategoryEnum | undefined): Promise<Category[]> {
    if (!slug) {
      return await this.categoryRepository.find();
    }

    return await this.categoryRepository.find({
      where: {
        slug,
      },
    });
  }

  async infiniteList(query: PaginateQuery): Promise<Paginated<Category>> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id'],
      searchableColumns: ['name'],
      defaultSortBy: [['id', 'ASC']],
      filterableColumns: {
        slug: [FilterOperator.EQ],
        id: [FilterOperator.IN],
      },
    });
  }

  async findBySlug(slug: CategoryEnum): Promise<Category> {
    try {
      const item = await this.categoryRepository.findOneOrFail({
        where: {
          slug,
        },
      });
      return item;
    } catch (e) {
      console.error(e);
      throw new NotFoundException();
    }
  }

  async getByIds(ids: number[]): Promise<Category[]> {
    const items = await this.categoryRepository.find({
      where: { id: In(ids) },
    });

    return items;
  }

  //? ---------------------------------------------------------------------- ?//
  //? SEED
  //? ---------------------------------------------------------------------- ?//

  async seed(): Promise<void> {
    const items = [
      {
        slug: CategoryEnum.FREE_CUSTOM,
        name: CategoryLabels[CategoryEnum.FREE_CUSTOM],
      },
      {
        slug: CategoryEnum.FREE_CARE,
        name: CategoryLabels[CategoryEnum.FREE_CARE],
      },
      {
        slug: CategoryEnum.FREE_OPTIONAL,
        name: CategoryLabels[CategoryEnum.FREE_OPTIONAL],
      },
      {
        slug: CategoryEnum.PAID_OPTIONAL,
        name: CategoryLabels[CategoryEnum.PAID_OPTIONAL],
      },
    ];

    // 순서 보장을 위해서 for ...of loop 사용.
    for (const item of items) {
      const category = new Category(item);
      await this.categoryRepository.manager.save(category);
    }
  }
}
