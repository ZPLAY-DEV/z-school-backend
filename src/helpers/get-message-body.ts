//? ✅ 카카오 알림톡

//? ------------------------------------------------------------------------ ?//
//? 수업시작
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfClassStart = (dto: {
  school: string;
  lesson: string;
  samName: string;
  location: string;
  period: string;
  name: string;
  status: string;
}) => `[${dto.school}] 수업시작알림

${dto.school} ${dto.lesson} 수업(담당: ${dto.samName} 선생님) 시작했습니다.

◼ 장소 : ${dto.location}
◼ 시간 : ${dto.period}
◼ 학생 : ${dto.name}
◼ 출결 : ${dto.status}
`;

//? ------------------------------------------------------------------------ ?//
//? 수업종료
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfClassEnd = (dto: {
  school: string;
  lesson: string;
  samName: string;
  location: string;
  period: string;
  name: string;
  status: string;
}) => `[${dto.school}] 수업종료알림

${dto.school} ${dto.lesson} 수업(담당: ${dto.samName} 선생님) 종료했습니다.

◼ 장소 : ${dto.location}
◼ 시간 : ${dto.period}
◼ 학생 : ${dto.name}
◼ 출결 : ${dto.status}
`;

//? ------------------------------------------------------------------------ ?//
//? 조퇴알림
//? ------------------------------------------------------------------------ ?//
// content: `[스쿨허브] 조퇴알림
// ${dto.name} 학생이 ${dto.school} 에서 조퇴했습니다.
// ◼ 시간 : ${dto.timestamp}
// ◼ 사유 : ${dto.reason}
// `;

export const getTemplateOfEarlyLeave = (dto: {
  name: string;
  school: string;
  timestamp: string;
  reason: string;
}) => `[${dto.school}] 조퇴알림

${dto.name} 학생이 ${dto.school} 에서 ${dto.timestamp}에 조퇴했습니다.
`;

//? ------------------------------------------------------------------------ ?//
//? 하교알림
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfDeparture = (dto: {
  name: string;
  school: string;
  timestamp: string;
}) => `[${dto.school}] 하교알림

${dto.name} 학생이 ${dto.school} 에서 ${dto.timestamp}에 하교했습니다.
`;

//? ------------------------------------------------------------------------ ?//
//? 수강 신청 안내
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfRegistration = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  period: string; // `9월1일 09:00 ~ 9월9일 17:00`
  shortlink: string;
}) => `[${dto.school}] 수강신청 바로가기

${dto.school} 에 자녀를 등록한 학부모님께 ${dto.term} 늘봄학교 수강신청을 위한 안내입니다.

◼ 수강신청 기간 : ${dto.period}
◼ 신청 바로가기 : ${dto.shortlink}

※ 이 메시지는 ${dto.school} 늘봄학교 수강신청 안내를 위한 목적으로 발송되었습니다.
`;

//! ------------------------------------------------------------------------ ?//
//! 공지사항) 수업변동사항안내 (NewsClassChange1)
//! 공지사항) 수업일정변경안내 (NewsScheduleChange1)
//! ------------------------------------------------------------------------ ?//

//? ------------------------------------------------------------------------ ?//
//? 공지사항) 수업 일정 안내 (NewsSchedule1)
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfNewsSchedule = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  title: string; // `제목`
  shortlink: string;
}) => `[${dto.school}] 수업 일정 안내

${dto.school} ${dto.term} 늘봄학교를 신청하신 학부모님께 수업 일정 안내를 위해 전달드립니다.

◼ 제목 : ${dto.title}
◼ 학인하기 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 공지사항) 수업 운영 안내 (NewsManagement1)
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfNewsManagement = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  title: string; // `제목`
  shortlink: string;
}) => `[${dto.school}] 수업 운영 안내

${dto.school} ${dto.term} 늘봄학교를 신청하신 학부모님께 수업 운영 안내를 위해 전달드립니다.

◼ 제목 : ${dto.title}
◼ 학인하기 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 공지사항) 수업 일정 안내 (NewsRegistrationResult1)
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfNewsRegistrationResult = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  title: string; // `제목`
  shortlink: string;
}) => `[${dto.school}] 수강 신청 결과

${dto.school} ${dto.term} 늘봄학교를 신청하신 학부모님께 수강 신청 결과 안내를 위해 전달드립니다.

◼ 제목 : ${dto.title}
◼ 학인하기 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 공지사항) 수업 준비물 안내 (NewsClassSupplies1)
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfNewsSupplies = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  title: string; // `제목`
  shortlink: string;
}) => `[${dto.school}] 수업 준비물 안내

${dto.school} ${dto.term} 늘봄학교 신청하신 학부모님께 수업 준비물 안내를 위해 전달드립니다.

◼ 제목 : ${dto.title}
◼ 학인하기 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 수강확정
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfRegistrationEnd = (dto: {
  school: string;
  term: string;
}) => `[${dto.school}] 수강신청 확정알림

${dto.school} ${dto.term} 늘봄학교를 위한 수강신청이 확정되었습니다.
`;

//? ------------------------------------------------------------------------ ?//
//? 인증코드
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfOtp = (dto: { otp: string }) => `[스쿨허브] 인증코드

요청하신 인증코드는 아래와 같습니다.

◼ 인증코드 : ${dto.otp}
`;
