import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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

  async list(slug?: CategoryEnum): Promise<Category[]> {
    if (!slug) {
      return await this.categoryRepository.find();
    }

    return await this.categoryRepository.find({
      where: {
        slug,
      },
    });
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

  async seed(): Promise<number> {
    const items = [
      {
        slug: CategoryEnum.FREE_CUSTOM,
        name: CategoryLabels[CategoryEnum.FREE_CUSTOM],
        note: '맞춤형 1,2학년 대상 (누구나 신청만 하면 듣는 수업)',
      },
      {
        slug: CategoryEnum.FREE_CARE,
        name: CategoryLabels[CategoryEnum.FREE_CARE],
        note: '돌봄 (선착순, 추첨, 재수강우선 3방식 중 학교가 선택)',
      },
      {
        slug: CategoryEnum.FREE_OPTIONAL,
        name: CategoryLabels[CategoryEnum.FREE_OPTIONAL],
        note: '방과후 (선착순, 추첨, 재수강우선 3방식 중 학교가 선택)',
      },
      {
        slug: CategoryEnum.PAID_OPTIONAL,
        name: CategoryLabels[CategoryEnum.PAID_OPTIONAL],
        note: '방과후 (선착순, 추첨, 재수강우선 3방식 중 학교가 선택)',
      },
    ];

    // 순서 보장을 위해서 for ...of loop 사용.
    for (const item of items) {
      // 이미 존재하는지 확인
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: item.slug },
      });

      // 존재하지 않을 때만 생성
      if (!existingCategory) {
        const category = new Category(item);
        await this.categoryRepository.manager.save(category);
      }
    }
    return items.length;
  }
}
