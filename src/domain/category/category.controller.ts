import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Public } from 'src/common/decorators/public.decorator';
import { Category as CategoryEnum } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @ApiOperation({ description: 'return all list' })
  @Get()
  async loadAll(@Query('slug') slug?: CategoryEnum): Promise<Category[]> {
    return await this.categoryService.list(slug);
  }

  @Public()
  @ApiOperation({ description: 'return paginated list' })
  @Get('paginated')
  async infiniteList(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Category>> {
    return await this.categoryService.infiniteList(query);
  }

  //? ---------------------------------------------------------------------- ?//
  //? SEED (DB 생성 후, 단 한번만 호출)
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ description: 'seed categories' })
  @Post('seed')
  async seed(): Promise<void> {
    return await this.categoryService.seed();
  }
}
