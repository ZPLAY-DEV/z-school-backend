import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { StatusCodes } from 'http-status-codes';
import { ApiStatuses } from 'src/common/decorators/simple-status.decorator';
import { ApiOkResponseTemplate } from 'src/common/swagger/response/api-ok-response';
import { ResponseCreateOfferingPickDto } from 'src/domain/group/dto/response-create-offering-pick.dto';
import { CreateAutoPickDto } from 'src/domain/offering/dto/create-auto-pick.dto';

//? ---------------------------------------------------------------------- ?//
//? Create Offering Pick
//? ---------------------------------------------------------------------- ?//

export const CreateOfferingPickDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🎯 수강생 확정 처리',
      description: `
**📝 기능 설명**
- 수강신청과목에 대해 최종 수강생을 확정합니다
- 설정된 수강신청 규칙에 따라 자동으로 수강생을 선별합니다
- 선착순, 재수강우선, 무작위, 누구나 등 다양한 방식을 지원합니다

**🔄 비즈니스 로직**
1. offeringId로 해당 수강신청과목 조회
2. 설정된 pickRule에 따른 선별 로직 실행
3. 선착순: 수강신청 시간 순으로 정원만큼 선발
4. 재수강우선: 이전 수강생 우선 후 선착순 적용
5. 무작위: 신청자 중 무작위 추첨으로 선발
6. 누구나: 모든 신청자 승인 (정원 무제한)
7. 확정된 수강생 목록과 통계 반환

**⚠️ 중요 제약사항**
- offeringId는 필수 파라미터이며 유효한 수강신청과목이어야 함
- 이미 수강생이 확정된 과목은 재실행 불가
- 수강신청 기간이 종료된 과목만 처리 가능
- 정원이 설정된 경우 해당 정원을 초과하지 않음

**📚 예시 시나리오**
- 선착순 과목의 수강생 확정 (신청 시간 순 정렬)
- 재수강생 우선권 적용 후 잔여 정원 선착순 배정
- 인기 과목의 무작위 추첨을 통한 공정한 선발
- 자율활동 과목의 전체 신청자 승인

**📊 반환 데이터 구조**
- 확정된 수강생 수와 대기자 수
- 선별 방식별 세부 통계
- 확정된 학생 ID 목록
- 처리 결과 상태 정보
      `,
    }),
    ApiParam({
      name: 'offeringId',
      description: `수강신청과목 ID
      
**파라미터 상세 정보:**
- **타입**: number (정수)
- **필수여부**: 필수
- **설명**: 수강생을 확정하려는 수강신청과목의 고유 ID
- **유효성 검사**: 
  - 존재하는 수강신청과목 ID여야 함
  - 삭제되지 않은 활성 과목이어야 함
  - 수강신청 기간이 종료된 과목이어야 함
  - 아직 수강생이 확정되지 않은 과목이어야 함

**예시 값들:**
- 일반 과목: 123 (바이올린 A반)
- 인기 과목: 456 (축구부)
- 자율 활동: 789 (독서토론반)`,
      type: 'number',
      example: 123,
    }),
    ApiOkResponseTemplate({
      description: '수강생 확정 완료',
      type: ResponseCreateOfferingPickDto,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};

//? ---------------------------------------------------------------------- ?//
//? Create Auto Pick
//? ---------------------------------------------------------------------- ?//

export const CreateAutoPickDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '🤖 자동 수강생 확정 처리',
      description: `
**📝 기능 설명**
- 수강신청기간 종료 후에는, "추첨" 을 제외한 모든 수강신청과목의 수강생 확정이 가능합니다.
- 따사러, PENDING 상태의 수강신청과목들을 일괄 처리합니다. "추첨" 의 경우라도, 만일
- 지원생이 정원을 초과하지 않는다면, 자동으로 수강생을 확정합니다.
- 단, 정원은 capacity (교과정원) - prepicked (재수강자) 로 계산합니다.

**🔄 비즈니스 로직**
1. schoolId와 termId로 PENDING 상태의 모든 수강신청과목 조회
2. 각 과목별로 설정된 pickRule에 따른 선별 로직 실행
3. 무작위(RANDOM) 규칙의 경우 신청자 수가 정원 이하일 때만 처리
4. 선착순(FIRST), 누구나(ANYONE) 규칙은 조건 없이 처리
5. 처리된 과목들의 ID 목록을 반환

**⚠️ 중요 제약사항**
- termId는 필수 파라미터이며 유효한 학기 ID여야 함
- schoolId는 선택사항이며, 미지정 시 전체 학교 대상
- PENDING 상태의 수강신청과목만 처리 대상
- 이미 확정된 과목은 재처리되지 않음
- 무작위 규칙 과목은 신청자 수가 정원 이하일 때만 자동 확정

**📚 예시 시나리오**
- 학기 종료 시 모든 수강신청과목 일괄 확정
- 특정 학교의 수강신청과목들만 선택적 확정
- 무작위 추첨 과목의 공정한 자동 확정
- 선착순 과목의 신청 순서 기반 확정

**📊 반환 데이터 구조**
- 자동 확정 처리된 수강신청과목 ID 배열
- 처리된 과목 수와 실패한 과목 정보
- 각 과목별 확정 결과 요약
- 전체 처리 상태 및 통계 정보

**🎯 처리 우선순위**
1. 무작위 규칙 과목 (신청자 ≤ 정원)
2. 선착순 규칙 과목
3. 누구나 규칙 과목
4. 기타 규칙 과목
      `,
    }),
    ApiBody({
      type: CreateAutoPickDto,
      description: `자동 수강생 확정 요청 데이터

**요청 데이터 상세:**
- **schoolId**: 학교 ID (선택사항, 미지정 시 전체 학교)
- **termId**: 학기 ID (필수, 처리할 학기 지정)

**데이터 유효성:**
- termId는 반드시 존재하는 학기 ID여야 함
- schoolId가 지정된 경우 해당 학교의 과목만 처리
- schoolId가 미지정된 경우 전체 학교의 과목 처리`,
    }),
    ApiOkResponseTemplate({
      description: '자동 수강생 확정 완료',
      type: Array<number>,
    }),
    ApiStatuses(StatusCodes.NOT_FOUND, StatusCodes.BAD_REQUEST),
  );
};
