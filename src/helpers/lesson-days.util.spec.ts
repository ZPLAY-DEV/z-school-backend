import { Weekday } from 'src/common/enums/weekday';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { calculateLessonDays, generateSchooldays } from './lesson-days.util';

describe('calculateLessonDays', () => {
  const baseLesson = new Lesson({
    start: '2024-06-03', // 월요일
    end: '2024-06-17', // 다음주 월요일까지(3주)
    termId: 1,
    categoryId: 1,
    schoolId: 1,
    lessonName: '테스트',
    termlyLessonCount: 0,
    weeklyLessonCount: 0,
    total: 0,
    instructorFee: 0,
    bookFees: null,
    materialFees: null,
    operationFee: 0,
    operationFeeRule: null,
    requiredDocuments: null,
    note: null,
    status: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    category: undefined,
    term: undefined,
    groups: [],
    offerings: [],
    ledgers: [],
    samLessons: [],
  });
  const baseGroup = new Group({
    weekday: Weekday.MONDAY,
    start: '10:00',
    end: '12:00',
    groupName: 'A',
    lessonId: 1,
    samId: 1,
    location: null,
    capacity: 20,
    allowedGrades: '1',
    status: undefined,
    tuition: 0,
    bookFee: 0,
    materialFee: 0,
    days: 0,
    deletedBy: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    schooldays: [],
    sam: undefined,
    lesson: undefined,
    picks: [],
    boards: [],
  });

  it('월요일 3주, 휴일 없이 정상 반환', () => {
    const result = calculateLessonDays(baseLesson, baseGroup);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      start: '2024-06-03 10:00',
      end: '2024-06-03 12:00',
      classOn: true,
    });
    expect(result[1].start).toContain('2024-06-10');
    expect(result[2].start).toContain('2024-06-17');
  });

  it('월요일 3주, 중간에 휴일이 있으면 classOn이 false', () => {
    const offdays = ['2024-06-10'];
    const result = calculateLessonDays(baseLesson, baseGroup, offdays);
    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({
      start: '2024-06-10 10:00',
      end: '2024-06-10 12:00',
      classOn: false,
    });
  });

  it('시작/종료일이 없으면 빈 배열 반환', () => {
    const lesson = new Lesson({
      ...baseLesson,
      start: undefined,
      end: undefined,
    });
    const result = calculateLessonDays(lesson, baseGroup);
    expect(result).toEqual([]);
  });

  it('group의 요일이 화요일이면, 해당 요일만 반환', () => {
    const group = new Group({ ...baseGroup, weekday: Weekday.TUESDAY });
    const result = calculateLessonDays(baseLesson, group);
    // 2024-06-04, 2024-06-11
    expect(result).toHaveLength(2);
    expect(result[0].start).toContain('2024-06-04');
    expect(result[1].start).toContain('2024-06-11');
  });

  it('generateSchooldays: 월요일 3주, 휴일 없이 정상 반환', () => {
    const lesson = new Lesson({ ...baseLesson, id: 10 });
    const group = new Group({ ...baseGroup, id: 20 });
    const result = generateSchooldays(lesson, group);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      schoolId: lesson.schoolId,
      termId: lesson.termId,
      lessonId: lesson.id,
      groupId: group.id,
      name: '수업',
      duration: 120,
      note: null,
    });
    expect(result[0].startsAt).toBeInstanceOf(Date);
    expect(result[0].endsAt).toBeInstanceOf(Date);
  });

  it('generateSchooldays: 중간에 휴일이 있으면 해당 날짜는 제외', () => {
    const lesson = new Lesson({ ...baseLesson, id: 11 });
    const group = new Group({ ...baseGroup, id: 21 });
    const offdays = ['2024-06-10'];
    const result = generateSchooldays(lesson, group, offdays);
    expect(result).toHaveLength(2);
    expect(
      result.find((d) => d.startsAt.toISOString().startsWith('2024-06-10')),
    ).toBeUndefined();
  });
});
