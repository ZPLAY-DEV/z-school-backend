/**
 * 자동화 입력 스크립트
 * how to execute? `node db-syllabus.js`
 */

const fs = require('fs');
const path = require('path');

const url = 'http://localhost:3001/v1';

async function loginAndGetToken() {
  const res = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'a@gmail.com',
      password: '1111',
      role: 'MANAGER',
    }),
  });

  const data = await res.json();
  return data.accessToken;
}

// 한글 태그를 BodyPart enum으로 변환
function convertTagsToBodyPart(koreanTag) {
  const tagMap = {
    다리힘: ['LEG'],
    다리: ['LEG'],
    골반척추: ['PELVIS', 'SPINE'],
    척추: ['SPINE'],
    팔다리: ['ARM', 'LEG'],
    골반다리: ['PELVIS', 'LEG'],
    다리골반: ['LEG', 'PELVIS'],
    골반힘: ['PELVIS'],
    골반: ['PELVIS'],
    다리골반힘: ['LEG', 'PELVIS'],
    척추다리: ['SPINE', 'LEG'],
  };

  return tagMap[koreanTag] || [];
}

// 한글 타입을 ExerciseType enum으로 변환
function convertTypeToExerciseType(koreanType) {
  const typeMap = {
    균형: 'BALANCE',
    유연성: 'FLEXIBILITY',
  };

  return typeMap[koreanType] || koreanType;
}

// CSV 한 줄을 제대로 파싱하는 함수 (큰따옴표 처리)
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

// CSV 파일 읽고 CreateProgramDto[] 생성
function parseCsvToPrograms(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // 첫번째 줄은 헤더이므로 스킵
  const programs = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV 파싱 (큰따옴표 고려)
    const columns = parseCsvLine(line);

    if (columns.length < 13) continue;

    const [
      syllabusId,
      week,
      subject,
      name,
      type,
      tags,
      level,
      isScorable,
      nil, // 무시
      caption1,
      caption2,
      caption3,
      caption4,
    ] = columns;

    // tags 변환 (빈 배열이면 null로)
    const convertedTags = convertTagsToBodyPart(tags.trim());

    // type 변환
    const convertedType = convertTypeToExerciseType(type.trim());

    // isScorable 변환
    const convertedIsScorable = isScorable.trim() === 'V';

    // captions 배열 생성 (빈 값 제외)
    const captions = [caption1, caption2, caption3, caption4]
      .map((c) => c?.trim())
      .filter((c) => c && c.length > 0);

    const program = {
      syllabusId: parseInt(syllabusId.trim(), 10),
      week: parseInt(week.trim(), 10),
      subject: subject.trim(),
      name: name.trim(),
      type: convertedType,
      tags: convertedTags.length > 0 ? convertedTags : null,
      level: level.trim(),
      isScorable: convertedIsScorable,
      captions: captions.length > 0 ? captions : null,
    };

    programs.push(program);
  }

  return programs;
}

async function bulkCreatePrograms(programs, token) {
  try {
    const response = await fetch(`${url}/programs/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(programs),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(`🔴 에러:`, message);
      return null;
    }

    const result = await response.json();
    console.log(`🟢 성공: ${result.length}개의 프로그램이 생성되었습니다.`);
    return result;
  } catch (err) {
    console.error(`🔴 예외 발생:`, err.message);
    return null;
  }
}

async function run() {
  const token = await loginAndGetToken();
  console.log('✅ 토큰:', token);

  const csvPath = path.join(__dirname, 'syllabus.csv');
  console.log('✅ CSV 파일 읽기:', csvPath);

  const programs = parseCsvToPrograms(csvPath);
  console.log(`✅ ${programs.length}개의 프로그램 데이터 파싱 완료`);
  console.log('\n📋 처음 3개 프로그램 샘플:');
  programs.slice(0, 3).forEach((p, idx) => {
    console.log(`\n[${idx + 1}] ${p.name}`);
    console.log(`  - type: ${p.type} (${typeof p.type})`);
    console.log(`  - tags: ${JSON.stringify(p.tags)}`);
    console.log(`  - level: ${p.level}`);
    console.log(`  - isScorable: ${p.isScorable}`);
    console.log(`  - captions: ${p.captions ? p.captions.length + '개' : 'null'}`);
  });

  console.log('\n📤 Bulk API 호출 시작...\n');
  await bulkCreatePrograms(programs, token);
}

run();
