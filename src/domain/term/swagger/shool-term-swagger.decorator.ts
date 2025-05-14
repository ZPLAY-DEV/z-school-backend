import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiOkPaginatedResponse, ApiPaginationQuery } from 'nestjs-paginate';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/response/api-created.response';
import { ApiErrorResponseTemplate } from 'src/core/swagger/response/api-error.response';
import { ApiOkResponseTemplate } from 'src/core/swagger/response/api-ok-response';
import { Term } from 'src/domain/term/entities/term.entity';
import { CreateTermDto } from '../dto/create-term.dto';
import { TermResponseDto } from '../dto/term-response.dto';

//? ---------------------------------------------------------------------- ?//
//? Private) Term 생성
//? ---------------------------------------------------------------------- ?//
export const CreateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 👈 생성',
      description: `
      - 학교에 귀속된 운영기간관리를 생성.
      - 날짜 형식은 YYYY-MM-DD 형식으로 입력.
      - 기간 시작일이 종료일 보다 앞서야 함 -> 시작일보다 종료일이 앞설 경우 400 Validation Error 발생.
      - 수강신청 시작일이 종료일 보다 앞서야 함 -> 수강신청 시작일이 종료일 보다 앞설 경우 400 Validation Error 발생.
      - 수강신청 시작일과 종료일이 학기 시작일과 종료일 사이에 있어야 함 -> 수강신청 시작일과 종료일이 학기 시작일과 종료일 사이에 있지 않을 경우 400 Validation Error 발생.
      - 수강신청 시작일과 종료일은 학기 시작 전에 있어야 함. (!)
      `,
    }),
    ApiBody({
      type: CreateTermDto,
      examples: {
        example1: {
          value: {
            schoolYear: 2025,
            schoolName: '홍익대학교 사범대학 부속 초등학교',
            termName: '1학기',
            start: '2025-03-01',
            end: '2025-09-04',
          },
        },
      },
    }),
    ApiCreatedResponseTemplate({
      description: 'Term 생성 완료',
      type: TermResponseDto,
    }),
    ApiErrorResponseTemplate([
      {
        status: StatusCodes.NOT_FOUND,
        errorFormatList: [HttpErrorConstants.NOT_FOUND_SCHOOL],
      },
      {
        status: StatusCodes.BAD_REQUEST,
        errorFormatList: [
          HttpErrorConstants.VALIDATE_ERROR,
          HttpErrorConstants.DUPLICATE_TERM,
        ],
      },
    ]),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Private) 학교별 Term 조회
//? ---------------------------------------------------------------------- ?//

export const ListTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 👈 리스트 (all)',
      description: `
      - 학교에 귀속된 운영기간을 조회
      - 정렬은 Year, Start 순으로 정렬되어서 반환.
      `,
    }),
    ApiOkResponseTemplate({
      description: 'Term 조회 완료',
      type: Term,
      isArray: true,
    }),
  );
};

export const PaginatedTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교별 운영기간을 일괄로 조회 & 검색 & 필터 (페이징)',
      description: `
      - 해당 엔드포인트로 페이징 기반의 학기 전체조회, 학기 검색, 필터가 가능함.
      - 기본 정렬은 Year, Start 순으로 정렬되어서 반환.
      - 검색 조건: schoolYear(학사년도), start(시작일)
        - 검색시 QueryString에 search 키워드를 통해 검색 조건을 입력할 수 있음. EX) ?search=2025-03-02 ?search=2025 ...
      - 필터 조건: schoolYear(학사년도), name(운영기간 명)
        - 필터시 QueryString에 filter.schoolYear, filter.name .. 키워드를 통해 필터 조건을 입력할 수 있음. EX) ?filter.schoolYear=2025&filter.name=2025-1분기 ...
      - 정렬은 기본적으로 Year, Start 순으로 정렬됨.
      - 정렬 조건: schoolYear(학사년도), start(시작일)
        - 정렬시 QueryString에 sortBy 키워드를 통해 정렬 조건을 입력할 수 있음. EX) ?sortBy=schoolYear:ASC&sortBy=start:ASC ...
      `,
    }),
    ApiOkPaginatedResponse(TermResponseDto, {
      sortableColumns: ['schoolYear', 'start'],
      defaultSortBy: [
        ['schoolYear', 'ASC'],
        ['start', 'ASC'],
      ],
      searchableColumns: ['schoolYear', 'termName'],
      filterableColumns: {
        schoolYear: true,
        termName: true,
      },
    }),
    ApiPaginationQuery({
      sortableColumns: ['schoolYear', 'start'],
      defaultSortBy: [
        ['schoolYear', 'ASC'],
        ['start', 'ASC'],
      ],
      searchableColumns: ['schoolYear', 'termName'],
      filterableColumns: {
        schoolYear: true,
        termName: true,
      },
    }),
  );
};

//? ---------------------------------------------------------------------- ?//
//? 학교별 Term 수정
//? ---------------------------------------------------------------------- ?//

export const UpdateTermDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '학교 > 학기 👈 수정',
      description: `
      - 학교에 귀속된 학기 정보 수정
      - bookingStart 속성값을 최초 입력시, 수강신청과목 (offerings) 테이블이 생성되고, isBookingReady 가 true 로 변경됨.
      `,
    }),
    ApiOkResponseTemplate({
      description: 'Term 수정 완료',
      type: Term,
      isArray: false,
    }),
  );
};
