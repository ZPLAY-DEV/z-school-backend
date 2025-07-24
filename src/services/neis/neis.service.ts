import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addMonths, format } from 'date-fns';
import * as qs from 'qs';
import { CalendarType } from 'src/common/enums';
import { CreateCalendarDto } from 'src/domain/calendar/dto/create-calendar.dto';

interface SchoolInfoProps {
  authorityCode: string; // 관할교육청코드
  schoolCode: string; // 학교코드
  schoolId: number; // DB의 학교ID
}

// Interface for the calendar item
interface NeisScheduleItem {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AY: string;
  AA_YMD: string;
  ATPT_OFCDC_SC_NM: string;
  SCHUL_NM: string;
  DGHT_CRSE_SC_NM: string | null;
  SCHUL_CRSE_SC_NM: string;
  EVENT_NM: string;
  EVENT_CNTNT: string;
  ONE_GRADE_EVENT_YN: string;
  TW_GRADE_EVENT_YN: string;
  THREE_GRADE_EVENT_YN: string;
  FR_GRADE_EVENT_YN: string;
  FIV_GRADE_EVENT_YN: string;
  SIX_GRADE_EVENT_YN: string;
  SBTR_DD_SC_NM: string;
  LOAD_DTM: string;
}

// Interface for the NEIS API response
interface NeisApiResponse {
  SchoolSchedule: [
    {
      head: [
        { list_total_count: number },
        { RESULT: { CODE: string; MESSAGE: string } },
      ];
    },
    {
      row: NeisScheduleItem[];
    },
  ];
}

@Injectable()
export class NeisService {
  private neisAuthKey: string;

  constructor(private readonly configService: ConfigService) {
    this.neisAuthKey = this.configService.get<string>('neis.apiKey') || '';
  }

  async getCalendar({
    authorityCode,
    schoolCode,
    schoolId,
  }: SchoolInfoProps): Promise<CreateCalendarDto[]> {
    const now = new Date();
    const currentYear = format(now, 'yyyy');
    const fromDate = format(now, 'yyyyMMdd');
    const toDate = format(addMonths(now, 9), 'yyyyMMdd');
    const options = {
      ATPT_OFCDC_SC_CODE: authorityCode,
      SD_SCHUL_CODE: schoolCode,
      KEY: this.neisAuthKey,
      Type: 'json',
      pIndex: 1,
      pSize: 100, // 최대 100개
      AA_FROM_YMD: fromDate, // 조회하는 오늘
      AA_TO_YMD: toDate, // 조회하는 오늘 + 6개월
    };

    try {
      // Convert options to query string using qs
      const queryString = qs.stringify(options);
      const uri = `https://open.neis.go.kr/hub/SchoolSchedule?${queryString}`;
      const response = await fetch(uri);
      console.log(`🚀`, uri);

      // Parse the response
      const data = (await response.json()) as NeisApiResponse;
      if (
        data.SchoolSchedule &&
        data.SchoolSchedule.length >= 2 &&
        data.SchoolSchedule[1].row
      ) {
        const rows = data.SchoolSchedule[1].row;
        const calendars = rows
          .filter((v) => v.AY === currentYear)
          .map((row) => {
            const dateInIso8601 = row.AA_YMD.replace(
              /(\d{4})(\d{2})(\d{2})/,
              '$1-$2-$3',
            );
            return {
              schoolId: schoolId,
              name: row.EVENT_NM,
              date: dateInIso8601,
              status: this._transformStatus(row.EVENT_CNTNT, row.SBTR_DD_SC_NM),
              note: `${row.EVENT_NM} ${row.SBTR_DD_SC_NM}`,
            } as unknown as CreateCalendarDto;
          });

        // Handle duplicate dates by merging notes
        const uniqueCalendars = this._dedupeDates(calendars);
        return uniqueCalendars;
      }
      return [];
    } catch (e) {
      console.error(e);
      throw new Error('NEIS API 호출 오류');
    }
  }

  /**
   * Remove duplicate dates by keeping one record and merging notes
   */
  private _dedupeDates(calendars: CreateCalendarDto[]): CreateCalendarDto[] {
    const dateMap = new Map<string, CreateCalendarDto>();

    for (const calendar of calendars) {
      const dateKey = format(calendar.date, 'yyyy-MM-dd');
      const existingCalendar = dateMap.get(dateKey);

      if (existingCalendar) {
        existingCalendar.note = `${existingCalendar.note}, ${calendar.note}`;
      } else {
        dateMap.set(dateKey, calendar);
      }
    }

    return Array.from(dateMap.values());
  }

  private _transformStatus(eventName: string, eventNote: string): CalendarType {
    if (eventNote === '휴업일') {
      if (eventName.includes('방학')) {
        return CalendarType.VACATION; // 방학기간
      }
      return CalendarType.CLOSEDDAY; // 휴업일
    }
    if (eventNote.includes('공휴일')) {
      return CalendarType.HOLIDAY; // 공휴일
    }
    if (eventNote.includes('해당없음')) {
      return CalendarType.EVENT; // 공휴일
    }
    return CalendarType.OTHER;
  }
}
