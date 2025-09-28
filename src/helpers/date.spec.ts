import { getDatesForWeekdayBetween } from './date';

describe('getDatesForWeekdayBetween', () => {
  describe('기본 동작 테스트', () => {
    it('월요일(1) 요청 시 해당하는 모든 월요일을 반환해야 한다', () => {
      // 2025년 9월 1일(월) ~ 2025년 9월 30일(화) 사이의 모든 월요일
      const start = new Date('2025-09-01');
      const end = new Date('2025-09-30');
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual(new Date('2025-09-01')); // 9월 1일 (월)
      expect(result[1]).toEqual(new Date('2025-09-08')); // 9월 8일 (월)
      expect(result[2]).toEqual(new Date('2025-09-15')); // 9월 15일 (월)
      expect(result[3]).toEqual(new Date('2025-09-22')); // 9월 22일 (월)
      expect(result[4]).toEqual(new Date('2025-09-29')); // 9월 29일 (월)
    });

    it('금요일(5) 요청 시 해당하는 모든 금요일을 반환해야 한다', () => {
      // 2025년 9월 1일(월) ~ 2025년 9월 30일(화) 사이의 모든 금요일
      const start = new Date('2025-09-01');
      const end = new Date('2025-09-30');
      const result = getDatesForWeekdayBetween(start, end, 5); // 금요일

      expect(result).toHaveLength(4); // 9월 30일이 화요일이므로 마지막 금요일은 9월 26일
      expect(result[0]).toEqual(new Date('2025-09-05')); // 9월 5일 (금)
      expect(result[1]).toEqual(new Date('2025-09-12')); // 9월 12일 (금)
      expect(result[2]).toEqual(new Date('2025-09-19')); // 9월 19일 (금)
      expect(result[3]).toEqual(new Date('2025-09-26')); // 9월 26일 (금)
    });

    it('일요일(0) 요청 시 해당하는 모든 일요일을 반환해야 한다', () => {
      // 2025년 9월 1일(월) ~ 2025년 9월 30일(화) 사이의 모든 일요일
      const start = new Date('2025-09-01');
      const end = new Date('2025-09-30');
      const result = getDatesForWeekdayBetween(start, end, 0); // 일요일

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(new Date('2025-09-07')); // 9월 7일 (일)
      expect(result[1]).toEqual(new Date('2025-09-14')); // 9월 14일 (일)
      expect(result[2]).toEqual(new Date('2025-09-21')); // 9월 21일 (일)
      expect(result[3]).toEqual(new Date('2025-09-28')); // 9월 28일 (일)
    });
  });

  describe('경계값 테스트', () => {
    it('시작일과 종료일이 같은 경우, 해당 요일이면 1개 반환해야 한다', () => {
      const date = new Date('2025-09-15'); // 월요일
      const result = getDatesForWeekdayBetween(date, date, 1); // 월요일

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(date);
    });

    it('시작일과 종료일이 같은 경우, 해당 요일이 아니면 빈 배열을 반환해야 한다', () => {
      const date = new Date('2025-09-15'); // 월요일
      const result = getDatesForWeekdayBetween(date, date, 2); // 수요일

      expect(result).toHaveLength(0);
    });

    it('범위가 7일 미만인 경우, 해당 요일이 1개만 있으면 1개만 반환해야 한다', () => {
      const start = new Date('2025-09-15'); // 월요일
      const end = new Date('2025-09-20'); // 토요일
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-15'));
    });

    it('시작일이 해당 요일보다 뒤에 있는 경우, 다음 주 해당 요일부터 시작해야 한다', () => {
      const start = new Date('2025-09-16'); // 화요일
      const end = new Date('2025-09-30'); // 화요일
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2025-09-22')); // 다음 주 월요일
      expect(result[1]).toEqual(new Date('2025-09-29')); // 그 다음 주 월요일
    });
  });

  describe('각 요일별 테스트', () => {
    const start = new Date('2025-09-01'); // 월요일
    const end = new Date('2025-09-07'); // 일요일 (1주일)

    it('일요일(0) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 0);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-07'));
    });

    it('월요일(1) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-01'));
    });

    it('화요일(2) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 2);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-02'));
    });

    it('수요일(3) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 3);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-03'));
    });

    it('목요일(4) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 4);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-04'));
    });

    it('금요일(5) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 5);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-05'));
    });

    it('토요일(6) 테스트', () => {
      const result = getDatesForWeekdayBetween(start, end, 6);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-06'));
    });
  });

  describe('월 경계 테스트', () => {
    it('월이 바뀌는 구간에서도 정확히 동작해야 한다', () => {
      const start = new Date('2025-09-29'); // 9월 29일 (월)
      const end = new Date('2025-10-06'); // 10월 6일 (월)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2025-09-29')); // 9월 29일 (월)
      expect(result[1]).toEqual(new Date('2025-10-06')); // 10월 6일 (월)
    });

    it('10월에서 11월로 넘어가는 구간에서도 정확히 동작해야 한다', () => {
      const start = new Date('2025-10-27'); // 10월 27일 (월)
      const end = new Date('2025-11-03'); // 11월 3일 (월)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2025-10-27')); // 10월 27일 (월)
      expect(result[1]).toEqual(new Date('2025-11-03')); // 11월 3일 (월)
    });
  });

  describe('연도 경계 테스트', () => {
    it('연도가 바뀌는 구간에서도 정확히 동작해야 한다', () => {
      const start = new Date('2025-12-30'); // 2025년 12월 30일 (화)
      const end = new Date('2026-01-06'); // 2026년 1월 6일 (화)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2026-01-05')); // 2026년 1월 5일 (월)
    });
  });

  describe('윤년 테스트', () => {
    it('윤년 2월에서도 정확히 동작해야 한다', () => {
      const start = new Date('2024-02-26'); // 2024년 2월 26일 (월) - 윤년
      const end = new Date('2024-03-04'); // 2024년 3월 4일 (월)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2024-02-26')); // 2월 26일 (월)
      expect(result[1]).toEqual(new Date('2024-03-04')); // 3월 4일 (월)
    });

    it('윤년 2월 29일이 포함된 구간에서도 정확히 동작해야 한다', () => {
      const start = new Date('2024-02-26'); // 2024년 2월 26일 (월)
      const end = new Date('2024-03-05'); // 2024년 3월 5일 (화)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(new Date('2024-02-26')); // 2월 26일 (월)
      expect(result[1]).toEqual(new Date('2024-03-04')); // 3월 4일 (월)
    });
  });

  describe('긴 기간 테스트', () => {
    it('3개월 기간에서도 정확히 동작해야 한다', () => {
      const start = new Date('2025-09-01'); // 9월 1일 (월)
      const end = new Date('2025-11-30'); // 11월 30일 (일)
      const result = getDatesForWeekdayBetween(start, end, 1); // 월요일

      // 9월: 1, 8, 15, 22, 29일 (5개)
      // 10월: 6, 13, 20, 27일 (4개)
      // 11월: 3, 10, 17, 24일 (4개)
      expect(result).toHaveLength(13);
      expect(result[0]).toEqual(new Date('2025-09-01'));
      expect(result[4]).toEqual(new Date('2025-09-29'));
      expect(result[5]).toEqual(new Date('2025-10-06'));
      expect(result[8]).toEqual(new Date('2025-10-27'));
      expect(result[9]).toEqual(new Date('2025-11-03'));
      expect(result[12]).toEqual(new Date('2025-11-24'));
    });
  });

  describe('예외 상황 테스트', () => {
    it('시작일이 종료일보다 늦은 경우 빈 배열을 반환해야 한다', () => {
      const start = new Date('2025-09-15');
      const end = new Date('2025-09-10');
      const result = getDatesForWeekdayBetween(start, end, 1);

      expect(result).toHaveLength(0);
    });

    it('잘못된 요일 값(음수)이 주어진 경우에도 동작해야 한다', () => {
      const start = new Date('2025-09-01');
      const end = new Date('2025-09-07');
      const result = getDatesForWeekdayBetween(start, end, -1);

      // 음수 요일은 모듈로 연산으로 처리됨
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-06')); // 토요일
    });

    it('잘못된 요일 값(7 이상)이 주어진 경우에도 동작해야 한다', () => {
      const start = new Date('2025-09-01');
      const end = new Date('2025-09-07');
      const result = getDatesForWeekdayBetween(start, end, 7);

      // 7 이상 요일은 모듈로 연산으로 처리됨 (7 % 7 = 0, 즉 일요일)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(new Date('2025-09-07')); // 일요일
    });
  });
});
