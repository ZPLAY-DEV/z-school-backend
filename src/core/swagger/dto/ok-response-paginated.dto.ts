// pagination-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  itemsPerPage: number;

  @ApiProperty({ description: '총 항목 수', example: 5 })
  totalItems: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  currentPage: number;

  @ApiProperty({ description: '총 페이지 수', example: 1 })
  totalPages: number;

  @ApiProperty({
    description: '정렬 기준',
    example: [['id', 'DESC']],
    items: { type: 'array', items: { type: 'string' } },
  })
  sortBy: [string, string][];
}
export class PaginationLinksDto {
  @ApiProperty({
    description: '현재 페이지 URL',
    example:
      'http://localhost:3001/v1/schools/1/terms/1/lessons/paginated?page=1&limit=20&sortBy=schoolId:DESC&sortBy=id:DESC',
  })
  current: string;

  @ApiProperty({
    description: '다음 페이지 URL',
    example:
      'http://localhost:3001/v1/schools/1/terms/1/lessons/paginated?page=2&limit=20&sortBy=schoolId:DESC&sortBy=id:DESC',
  })
  next: string;

  @ApiProperty({
    description: '마지막 페이지 URL',
    example:
      'http://localhost:3001/v1/schools/1/terms/1/lessons/paginated?page=2&limit=20&sortBy=schoolId:DESC&sortBy=id:DESC',
  })
  last: string;
}

export class PaginationResponseDto<T> {
  @ApiProperty({
    description: '응답 데이터',
    type: 'array',
    items: { type: 'object' },
  })
  data: T[];

  @ApiProperty({
    description: '페이지네이션 메타데이터',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  @ApiProperty({ description: '페이지네이션 링크', type: PaginationLinksDto })
  links: PaginationLinksDto;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'HTTP 상태 코드', example: 200 })
  statusCode: number;

  @ApiProperty({ description: '응답 메시지', example: 'OK' })
  message: string;

  @ApiProperty({ description: '응답 결과', type: () => PaginationResponseDto })
  result: PaginationResponseDto<T>;
}

export class HttpPaginatedResponseDto<T> {
  @ApiProperty({ description: 'HTTP 상태 코드', example: 200 })
  statusCode: number;

  @ApiProperty({ description: '응답 메시지', example: 'OK' })
  message: string;

  @ApiProperty({ description: '응답 결과', type: () => PaginationResponseDto })
  result: {
    data: T[];
    meta: {
      itemsPerPage: number;
      totalItems: number;
      currentPage: number;
      totalPages: number;
      sortBy: [string, string][];
      searchBy?: string[];
      search?: string;
      filter?: Record<string, any>;
    };
    links: {
      first?: string;
      previous?: string;
      current: string;
      next?: string;
      last?: string;
    };
  };
}
