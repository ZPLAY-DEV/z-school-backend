import { plainToClass } from 'class-transformer';
import { IsOptional, IsString, Matches, validate } from 'class-validator';
import { AllowedGradesTransform } from './allow-grades-transform.decorator';

class TestDto {
  @IsOptional()
  @AllowedGradesTransform()
  @IsString()
  @Matches(/^[1-9,\-~\s]+$/)
  allowedGrades?: string;
}

describe('AllowedGradesTransform', () => {
  describe('숫자 배열 → 문자열 변환', () => {
    it('number[]를 쉼표로 구분된 string으로 변환해야 함', () => {
      const plain = { allowedGrades: [1, 2, 3] };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('정렬되지 않은 number[]를 정렬된 string으로 변환해야 함', () => {
      const plain = { allowedGrades: [3, 1, 2] };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('중복된 숫자는 제거되어야 함', () => {
      const plain = { allowedGrades: [1, 2, 2, 3, 1] };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });
  });

  describe('문자열 정규화', () => {
    it('이미 string인 경우 공백을 제거하고 정렬해야 함', () => {
      const plain = { allowedGrades: ' 3 , 1 , 2 ' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('올바른 형식의 string은 정규화만 수행해야 함', () => {
      const plain = { allowedGrades: '1,2,3' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('빈 값이 있으면 제거해야 함', () => {
      const plain = { allowedGrades: '1,,2,3' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('중복된 값이 있으면 제거해야 함', () => {
      const plain = { allowedGrades: '1,2,2,3,1' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });
  });

  describe('범위 표현식 확장', () => {
    it('하이픈 범위를 확장해야 함: "1-3" → "1,2,3"', () => {
      const plain = { allowedGrades: '1-3' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('물결표 범위를 확장해야 함: "1~6" → "1,2,3,4,5,6"', () => {
      const plain = { allowedGrades: '1~6' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3,4,5,6');
    });

    it('혼합 표현식을 처리해야 함: "1,3-5,7" → "1,3,4,5,7"', () => {
      const plain = { allowedGrades: '1,3-5,7' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,3,4,5,7');
    });

    it('혼합 표현식(물결표)을 처리해야 함: "1,3~5,7" → "1,3,4,5,7"', () => {
      const plain = { allowedGrades: '1,3~5,7' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,3,4,5,7');
    });

    it('범위 확장 후 중복 제거해야 함: "1-3,2-4" → "1,2,3,4"', () => {
      const plain = { allowedGrades: '1-3,2-4' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3,4');
    });

    it('역순 범위는 빈 결과를 반환: "3-1"', () => {
      const plain = { allowedGrades: '3-1' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('');
    });

    it('공백이 있는 범위 표현식: " 1 - 3 , 5 " → "1,2,3,5"', () => {
      const plain = { allowedGrades: ' 1-3 , 5 ' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('1,2,3,5');
    });

    it('단일 숫자 범위: "3-3" → "3"', () => {
      const plain = { allowedGrades: '3-3' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('3');
    });
  });

  describe('validation 통합 테스트', () => {
    it('변환된 string이 validation을 통과해야 함 (number[] 입력)', async () => {
      const plain = { allowedGrades: [1, 2, 3] };
      const dto = plainToClass(TestDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('변환된 string이 validation을 통과해야 함 (string 입력)', async () => {
      const plain = { allowedGrades: '1,2,3' };
      const dto = plainToClass(TestDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.allowedGrades).toBe('1,2,3');
    });

    it('범위 표현식(하이픈)이 확장되어 validation 통과해야 함', async () => {
      const plain = { allowedGrades: '1-6' };
      const dto = plainToClass(TestDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.allowedGrades).toBe('1,2,3,4,5,6');
    });

    it('범위 표현식(물결표)이 확장되어 validation 통과해야 함', async () => {
      const plain = { allowedGrades: '1~6' };
      const dto = plainToClass(TestDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.allowedGrades).toBe('1,2,3,4,5,6');
    });

    it('복잡한 혼합 표현식도 정상 처리되어야 함', async () => {
      const plain = { allowedGrades: '1,3-5,7~9' };
      const dto = plainToClass(TestDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.allowedGrades).toBe('1,3,4,5,7,8,9');
    });
  });

  describe('edge cases', () => {
    it('빈 값은 그대로 반환해야 함', () => {
      const plain = { allowedGrades: '' };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('');
    });

    it('undefined는 그대로 반환해야 함', () => {
      const plain = {};
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBeUndefined();
    });

    it('null은 그대로 반환해야 함', () => {
      const plain = { allowedGrades: null };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBeNull();
    });

    it('빈 배열은 빈 문자열로 변환되어야 함', () => {
      const plain = { allowedGrades: [] };
      const dto = plainToClass(TestDto, plain);

      expect(dto.allowedGrades).toBe('');
    });
  });
});
