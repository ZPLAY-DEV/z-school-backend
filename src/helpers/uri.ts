export function getMobileRoute(data: {
  nanoId: string;
  type: string;
  termId: number;
  studentId: number;
}): string {
  // const baseUrl = 'https://app.schoolhub.co.kr';
  if (data.type === 'REGISTRATION') {
    return `/parent/nanoid/${data.nanoId}?type=REGISTRATION&termId=${data.termId}&studentId=${data.studentId}`;
  } else {
    return `/parent/nanoid/${data.nanoId}?type=NOTIFICATION&termId=${data.termId}&studentId=${data.studentId}`;
  }
}
