import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Category as CategoryEnum } from 'src/common/enums';
import { Category } from 'src/domain/category/entities/category.entity';
import { CategoryService } from './category.service';
import { GetCategoryListDocs } from './swagger/category-swagger.decorator';

@ApiTags('✅ Categories ( 분류 )')
@Controller('categories')
@UseInterceptors(ClassSerializerInterceptor)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  //? ---------------------------------------------------------------------- ?//
  //? READ
  //? ---------------------------------------------------------------------- ?//

  @Public()
  @GetCategoryListDocs()
  @Get()
  async getList(@Query('slug') slug?: CategoryEnum): Promise<Category[]> {
    return await this.categoryService.list(slug);
  }

  //? ---------------------------------------------------------------------- ?//
  //? SEED (DB 생성 후, 단 한번만 호출)
  //? ---------------------------------------------------------------------- ?//

  @ApiOperation({ summary: '⚙️ to seed data' })
  @Post('seed')
  async seed(): Promise<void> {
    return await this.categoryService.seed();
  }
}
