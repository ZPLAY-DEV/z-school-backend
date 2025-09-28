import { differenceInMinutes } from 'date-fns';
import { format, toZonedTime } from 'date-fns-tz';
import { WeekdayOrder } from 'src/common/enums';
import { ICalendarDay } from 'src/common/interfaces';
import { Group } from 'src/domain/group/entities/group.entity';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Schoolday } from 'src/domain/schoolday/entities/schoolday.entity';
import { getDatesForWeekdayBetween } from 'src/helpers/date';
import { parseTime } from 'src/helpers/parse';

export interface LessonDaysResult {
  calendarDays: any[];
  days: number;
}

export function calculateLessonDays(
  lesson: Lesson,
  group: Group,
  offdays: string[] = [],
): ICalendarDay[] {
  const calendarDays: ICalendarDay[] = [];

  // lesson.start와 lesson.end가 없으면 term.start와 term.end를 사용
  const startDateStr = lesson.start || lesson.term?.start;
  const endDateStr = lesson.end || lesson.term?.end;

  if (startDateStr && endDateStr) {
    console.log(
      `🔍 [calculateLessonDays] 시작 - lessonId: ${lesson.id}, groupId: ${group.id}`,
    );
    console.log(
      `📅 [calculateLessonDays] 입력 날짜 - startDateStr: ${startDateStr}, endDateStr: ${endDateStr}`,
    );
    console.log(
      `📅 [calculateLessonDays] 그룹 요일 - weekday: ${group.weekday}, WeekdayOrder: ${WeekdayOrder[group.weekday]}`,
    );

    // 1. 시작일 종료일 사이에 반이 있는 요일의 모든 날짜 추출
    const startDate = new Date(`${startDateStr}T00:00:00+09:00`);
    const endDate = new Date(`${endDateStr}T23:59:59+09:00`);

    console.log(`🕐 [calculateLessonDays] 날짜 범위 생성:`);
    console.log(
      `   - startDate: ${startDate.toISOString()} (로컬: ${startDate.toString()})`,
    );
    console.log(
      `   - endDate: ${endDate.toISOString()} (로컬: ${endDate.toString()})`,
    );

    const dates: Date[] = getDatesForWeekdayBetween(
      startDate,
      endDate,
      WeekdayOrder[group.weekday],
    );

    console.log(
      `📅 [calculateLessonDays] getDatesForWeekdayBetween 결과 - ${dates.length}개 날짜:`,
    );
    dates.forEach((date, index) => {
      console.log(
        `   ${index + 1}. ${date.toISOString()} (로컬: ${date.toString()})`,
      );
    });

    // 2. 반의 시간 정보 추출
    const [startHour, startMinute] = parseTime(group.start);
    const [endHour, endMinute] = parseTime(group.end);

    console.log(`⏰ [calculateLessonDays] 그룹 시간 정보:`);
    console.log(
      `   - group.start: "${group.start}" → 파싱: ${startHour}:${startMinute.toString().padStart(2, '0')}`,
    );
    console.log(
      `   - group.end: "${group.end}" → 파싱: ${endHour}:${endMinute.toString().padStart(2, '0')}`,
    );

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      console.log(
        `\n📅 [calculateLessonDays] 날짜 ${i + 1}/${dates.length} 처리 중:`,
      );
      console.log(
        `   - 원본 date: ${date.toISOString()} (로컬: ${date.toString()})`,
      );

      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0, 0);
      console.log(
        `   - startTime.setHours(${startHour}, ${startMinute}, 0, 0) 후: ${startTime.toISOString()} (로컬: ${startTime.toString()})`,
      );

      const start = format(
        toZonedTime(startTime, 'Asia/Seoul'),
        'yyyy-MM-dd HH:mm',
      );
      console.log(
        `   - toZonedTime(startTime, 'Asia/Seoul'): ${toZonedTime(startTime, 'Asia/Seoul').toISOString()}`,
      );
      console.log(`   - 최종 start 문자열: "${start}"`);

      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      console.log(
        `   - endTime.setHours(${endHour}, ${endMinute}, 0, 0) 후: ${endTime.toISOString()} (로컬: ${endTime.toString()})`,
      );

      const end = format(
        toZonedTime(endTime, 'Asia/Seoul'),
        'yyyy-MM-dd HH:mm',
      );
      console.log(
        `   - toZonedTime(endTime, 'Asia/Seoul'): ${toZonedTime(endTime, 'Asia/Seoul').toISOString()}`,
      );
      console.log(`   - 최종 end 문자열: "${end}"`);

      const isClassDay = offdays.includes(start.split(' ')[0]) ? false : true;
      console.log(
        `   - isClassDay: ${isClassDay} (offdays: ${JSON.stringify(offdays)})`,
      );

      calendarDays.push({ start, end, isClassDay });
    }

    console.log(
      `✅ [calculateLessonDays] 완료 - 총 ${calendarDays.length}개 calendarDays 생성`,
    );
  }

  return calendarDays;
}

export function generateSchooldays(
  lesson: Lesson,
  group: Group,
  offdays: string[] = [],
): Schoolday[] {
  console.log(
    `\n🚀 [generateSchooldays] 시작 - lessonId: ${lesson.id}, groupId: ${group.id}`,
  );

  const calendarDays: ICalendarDay[] = calculateLessonDays(
    lesson,
    group,
    offdays,
  );

  console.log(
    `📋 [generateSchooldays] calendarDays ${calendarDays.length}개 받음:`,
  );
  calendarDays.forEach((day, index) => {
    console.log(
      `   ${index + 1}. start: "${day.start}", end: "${day.end}", isClassDay: ${day.isClassDay}`,
    );
  });

  // 연속적인 주차 번호를 위해 모든 calendarDays에 대해 순차적으로 처리
  let weekNumber = 1; // 첫 번째 주차부터 시작

  const filteredDays = calendarDays.filter((day) => day.isClassDay);
  console.log(
    `📋 [generateSchooldays] isClassDay=true인 ${filteredDays.length}개 필터링`,
  );

  const schooldays = filteredDays.map((day, index) => {
    console.log(
      `\n🏫 [generateSchooldays] Schoolday ${index + 1}/${filteredDays.length} 생성 중:`,
    );
    console.log(`   - day.start: "${day.start}"`);
    console.log(`   - day.end: "${day.end}"`);

    const [startDateStr, startTimeStr] = day.start.split(' ');
    const [endDateStr, endTimeStr] = day.end.split(' ');
    const today = startDateStr;

    console.log(
      `   - 파싱된 startDateStr: "${startDateStr}", startTimeStr: "${startTimeStr}"`,
    );
    console.log(
      `   - 파싱된 endDateStr: "${endDateStr}", endTimeStr: "${endTimeStr}"`,
    );

    // local 시간을 UTC로 변환
    const startsAtString = `${startDateStr} ${startTimeStr}:00`;
    const endsAtString = `${endDateStr} ${endTimeStr}:00`;

    console.log(`   - startsAt 생성 문자열: "${startsAtString}"`);
    console.log(`   - endsAt 생성 문자열: "${endsAtString}"`);

    const startsAt = new Date(startsAtString);
    const endsAt = new Date(endsAtString);

    console.log(
      `   - startsAt 생성 결과: ${startsAt.toISOString()} (로컬: ${startsAt.toString()})`,
    );
    console.log(
      `   - endsAt 생성 결과: ${endsAt.toISOString()} (로컬: ${endsAt.toString()})`,
    );

    // 현재 시스템 타임존 정보 출력
    console.log(
      `   - 현재 시스템 타임존 오프셋: ${startsAt.getTimezoneOffset()}분`,
    );
    console.log(
      `   - 현재 시스템 타임존: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    );

    const duration = differenceInMinutes(endsAt, startsAt);
    console.log(`   - duration: ${duration}분`);

    const schoolday = {
      schoolId: lesson.schoolId,
      termId: lesson.termId,
      lessonId: lesson.id,
      groupId: group.id,
      name: lesson.lessonName,
      duration: duration,
      today: today,
      initial: today,
      weekday: group.weekday,
      weekNumber: weekNumber++,
      startsAt: startsAt,
      endsAt: endsAt,
      note: null,
    } as unknown as Schoolday;

    console.log(
      `   - 최종 schoolday.startsAt: ${schoolday.startsAt.toISOString()}`,
    );
    console.log(
      `   - 최종 schoolday.endsAt: ${schoolday.endsAt.toISOString()}`,
    );

    return schoolday;
  });

  console.log(
    `\n✅ [generateSchooldays] 완료 - 총 ${schooldays.length}개 schooldays 생성`,
  );
  console.log(`🔍 [generateSchooldays] 최종 결과:`);
  schooldays.forEach((schoolday, index) => {
    console.log(
      `   ${index + 1}. ${schoolday.today} ${schoolday.weekday} - startsAt: ${schoolday.startsAt.toISOString()}, endsAt: ${schoolday.endsAt.toISOString()}`,
    );
  });

  return schooldays;
}
