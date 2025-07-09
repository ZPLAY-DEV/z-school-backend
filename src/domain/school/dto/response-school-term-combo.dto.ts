import { ApiProperty } from '@nestjs/swagger';
import { Lesson } from 'src/domain/lesson/entities/lesson.entity';
import { Sam } from 'src/domain/sam/entities/sam.entity';
import { Student } from 'src/domain/student/entities/student.entity';

/**
 * 학교-학기 통합 데이터 응답 DTO
 * - 특정 학교의 특정 학기에 대한 모든 관련 정보를 통합 제공
 * - 프론트엔드에서 한 번의 API 호출로 필요한 모든 데이터를 수집 가능
 */
export class ResponseSchoolTermComboDto {
  @ApiProperty({
    description:
      '해당 학기에 개설된 수업(강좌) 목록 - 학기의 모든 교육과정 정보',
    type: [Lesson],
    example: [
      {
        id: 1,
        lessonName: '영어회화 초급반',
        category: '언어',
        grade: '1,2,3',
        maxStudents: 20,
        currentStudents: 15,
        weekday: 'MONDAY',
        startTime: '09:00',
        endTime: '10:30',
        location: '영어실',
        fee: 50000,
        status: 'ACTIVE',
      },
      {
        id: 2,
        lessonName: '창의 미술교실',
        category: '예술',
        grade: '1,2,3,4',
        maxStudents: 15,
        currentStudents: 12,
        weekday: 'WEDNESDAY',
        startTime: '14:00',
        endTime: '15:30',
        location: '미술실',
        fee: 45000,
        status: 'ACTIVE',
      },
    ],
  })
  lessons: Lesson[];

  @ApiProperty({
    description:
      '해당 학기에 참여하는 강사(Sam) 목록 - 수업을 담당하는 모든 강사 정보',
    type: [Sam],
    example: [
      {
        id: 1,
        name: '김영희',
        phone: '01012345678',
        email: 'kim@example.com',
        specialty: '영어교육',
        career: '10년',
        status: 'ACTIVE',
      },
      {
        id: 2,
        name: '박미술',
        phone: '01087654321',
        email: 'park@example.com',
        specialty: '미술교육',
        career: '7년',
        status: 'ACTIVE',
      },
    ],
  })
  sams: Sam[];

  @ApiProperty({
    description:
      '해당 학기에 등록된 학생 목록 - 수강신청을 완료한 모든 학생 정보',
    type: [Student],
    example: [
      {
        id: 1,
        studentName: '홍길동',
        grade: 3,
        className: '3학년 1반',
        phone: '01011111111',
        parentName: '홍아버지',
        parentPhone: '01022222222',
        status: 'ACTIVE',
      },
      {
        id: 2,
        studentName: '이영수',
        grade: 2,
        className: '2학년 3반',
        phone: '01033333333',
        parentName: '이어머니',
        parentPhone: '01044444444',
        status: 'ACTIVE',
      },
    ],
  })
  students: Student[];
}
