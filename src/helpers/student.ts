//
// 1,2,3 => 1학년2반3번
//
export function getStudentId(
  grade: string,
  clazz: string | null,
  studentCode: number | null,
): string {
  const g = grade.trim() || '?';
  const c = clazz ? clazz.trim() : '?';
  const gradeStr = g.length === 1 || !g.endsWith('학년') ? `${g}학년` : g;
  const classStr = c.length === 1 || !c.endsWith('반') ? `${c}반` : c;
  const codeStr = studentCode ? `${studentCode}번` : '?번';
  return `${gradeStr}${classStr}${codeStr}`;
}

//
// 1학년 2반 3 => "010203"
// 6학년 3반 4 => "060304"
// 1학년 코끼리반 1 => "01코끼리01"
//
export function getDigitStudentId(
  grade: string,
  clazz: string | null,
  studentCode: number | null,
): string {
  // Extract number from grade
  const gradeNumMatch = grade.match(/\d+/);
  const gradeNum = gradeNumMatch ? gradeNumMatch[0].padStart(2, '0') : '??';

  // Extract number from clazz, or use clazz without '반' if no number
  let clazzPart = '';
  if (clazz) {
    const clazzNumMatch = clazz.match(/\d+/);
    if (clazzNumMatch) {
      clazzPart = clazzNumMatch[0].padStart(2, '0');
    } else {
      clazzPart = clazz.replace(/반/g, '').trim();
    }
  } else {
    clazzPart = '??';
  }

  // studentCode as 2-digit zero-padded
  const codeStr =
    studentCode !== null && studentCode !== undefined
      ? studentCode.toString().padStart(2, '0')
      : '??';

  return `${gradeNum}${clazzPart}${codeStr}`;
}
