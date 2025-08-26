//? ✅ 카카오 알림톡

//? ------------------------------------------------------------------------ ?//
//? 수업시작
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfClassStart = (dto: {
  phone: string;
  school: string;
  lesson: string;
  samName: string;
  location: string;
  period: string;
  name: string;
  status: string;
}): {
  to: string;
  content: string;
  buttons?: {
    type: string;
    name: string;
    linkMobile: string;
    linkPc: string;
  }[];
} => {
  return {
    to: dto.phone,
    content: `[스쿨허브] 수업시작알림

${dto.school} ${dto.lesson} 수업(담당: ${dto.samName} 선생님) 시작했습니다.

◼ 장소 : ${dto.location}
◼ 시간 : ${dto.period}
◼ 학생 : ${dto.name}
◼ 출결 : ${dto.status}
`,
    buttons: [
      {
        type: 'WL',
        name: '스쿨허브',
        linkMobile: `https://app.schoolhub.co.kr`,
        linkPc: `https://app.schoolhub.co.kr`,
      },
    ],
  };
};

//? ------------------------------------------------------------------------ ?//
//? 수업종료
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfClassEnd = (dto: {
  phone: string;
  school: string;
  lesson: string;
  samName: string;
  location: string;
  period: string;
  name: string;
  status: string;
}) => {
  return {
    to: dto.phone,
    content: `[스쿨허브] 수업종료알림

${dto.school} ${dto.lesson} 수업(담당: ${dto.samName} 선생님) 종료했습니다.

◼ 장소 : ${dto.location}
◼ 시간 : ${dto.period}
◼ 학생 : ${dto.name}
◼ 출결 : ${dto.status}
`,
    buttons: [
      {
        type: 'WL',
        name: '스쿨허브',
        linkMobile: `https://app.schoolhub.co.kr`,
        linkPc: `https://app.schoolhub.co.kr`,
      },
    ],
  };
};
