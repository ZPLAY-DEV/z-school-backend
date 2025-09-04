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
}) => `[스쿨허브] 수업시작알림

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
}) => `[스쿨허브] 수업종료알림

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
}) => `[스쿨허브] 조퇴알림

${dto.name} 학생이 ${dto.school} 에서 ${dto.timestamp}에 조퇴했습니다.
`;

//? ------------------------------------------------------------------------ ?//
//? 하교알림
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfDeparture = (dto: {
  name: string;
  school: string;
  timestamp: string;
}) => `[스쿨허브] 하교알림

${dto.name} 학생이 ${dto.school} 에서 ${dto.timestamp}에 하교했습니다.
`;

//? ------------------------------------------------------------------------ ?//
//? 수강신청안내
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfRegistration = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  period: string; // `9월1일 09:00 ~ 9월9일 17:00`
  shortlink: string;
}) => `[스쿨허브] 수강신청 바로가기

${dto.school} ${dto.term} 수강신청을 위한 링크 안내입니다.

◼ 수강신청기간 : ${dto.period}
◼ 수강신청링크 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 공지사항안내
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfNews = (dto: {
  school: string;
  term: string; // `2025학년도 2학기`
  title: string; // `제목`
  shortlink: string;
}) => `[스쿨허브] 공지사항 바로가기

${dto.school} ${dto.term} 공지사항을 위한 링크 안내입니다.

◼ 제목 : ${dto.title}
◼ 링크 : ${dto.shortlink}
`;

//? ------------------------------------------------------------------------ ?//
//? 인증코드
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfOtp = (dto: { otp: string }) => `[스쿨허브] 인증코드

요청하신 인증코드는 아래와 같습니다.

◼ 인증코드 : ${dto.otp}
`;
