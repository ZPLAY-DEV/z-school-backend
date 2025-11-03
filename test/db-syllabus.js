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

// CSV 파일 읽고 week 정보와 program 정보를 분리
function parseCsvData(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // 첫번째 줄은 헤더이므로 스킵
  const weeksMap = new Map(); // key: "syllabusId-weekNumber", value: {syllabusId, week, subject}
  const programsData = [];

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

    const syllabusIdNum = parseInt(syllabusId.trim(), 10);
    const weekNum = parseInt(week.trim(), 10);
    const subjectStr = subject.trim();

    // Week 정보 수집 (중복 제거)
    const weekKey = `${syllabusIdNum}-${weekNum}`;
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, {
        syllabusId: syllabusIdNum,
        week: weekNum,
        subject: subjectStr,
      });
    }

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

    const programData = {
      syllabusId: syllabusIdNum,
      week: weekNum,
      name: name.trim(),
      type: convertedType,
      tags: convertedTags.length > 0 ? convertedTags : null,
      level: level.trim(),
      isScorable: convertedIsScorable,
      captions: captions.length > 0 ? captions : null,
    };

    programsData.push(programData);
  }

  return {
    weeks: Array.from(weeksMap.values()),
    programsData,
  };
}

// Syllabus 조회하여 weeks 정보 가져오기
async function getSyllabus(syllabusId, token) {
  try {
    const response = await fetch(`${url}/syllabuses/${syllabusId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(`🔴 Syllabus 조회 에러:`, message);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`🔴 Syllabus 조회 예외:`, err.message);
    return null;
  }
}

// Week 대량 생성
async function bulkCreateWeeks(weeksData, token) {
  try {
    const response = await fetch(`${url}/weeks/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(weeksData),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(`🔴 Week 생성 에러:`, message);
      return null;
    }

    const result = await response.json();
    console.log(`🟢 성공: ${result.length}개의 Week가 생성되었습니다.`);
    return result;
  } catch (err) {
    console.error(`🔴 Week 생성 예외:`, err.message);
    return null;
  }
}

// Week 매핑 생성 (syllabusId-week -> weekId)
async function buildWeekMapping(syllabusId, requiredWeeks, token) {
  const syllabus = await getSyllabus(syllabusId, token);
  if (!syllabus) {
    throw new Error(`Syllabus ${syllabusId}를 조회할 수 없습니다.`);
  }

  console.log(`\n📋 Syllabus: ${syllabus.name}`);
  console.log(`   기존 Week 개수: ${syllabus.weeks?.length || 0}개`);

  const weekMapping = new Map(); // key: weekNumber, value: weekId

  // 기존 weeks를 매핑에 추가
  if (syllabus.weeks && syllabus.weeks.length > 0) {
    syllabus.weeks.forEach((week) => {
      weekMapping.set(week.week, week.id);
      console.log(`   ✅ Week ${week.week}: ${week.subject} (id: ${week.id})`);
    });
  }

  // 필요한 week 중 없는 것 확인
  const missingWeeks = requiredWeeks.filter(
    (weekData) => !weekMapping.has(weekData.week),
  );

  if (missingWeeks.length > 0) {
    console.log(`\n⚠️  존재하지 않는 Week가 ${missingWeeks.length}개 발견되었습니다:`);
    missingWeeks.forEach((w) => {
      console.log(`   - Week ${w.week}: ${w.subject}`);
    });

    console.log('\n🔄 Week 자동 생성을 시도합니다...');
    const createdWeeks = await bulkCreateWeeks(missingWeeks, token);

    if (!createdWeeks) {
      console.log('\n❌ Week 생성에 실패했습니다.');
      console.log('\n대안: DB에 직접 INSERT');
      console.log('예시 SQL:');
      missingWeeks.forEach((w) => {
        console.log(
          `INSERT INTO weeks (syllabusId, week, subject) VALUES (${w.syllabusId}, ${w.week}, '${w.subject}');`,
        );
      });
      throw new Error('필요한 Week를 생성할 수 없습니다.');
    }

    // 새로 생성된 Week를 매핑에 추가
    createdWeeks.forEach((week) => {
      weekMapping.set(week.week, week.id);
      console.log(`   ✅ Week ${week.week}: ${week.subject} (id: ${week.id}) - 새로 생성됨`);
    });
  }

  return weekMapping;
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

  // CSV 데이터 파싱 (weeks와 programsData 분리)
  const { weeks, programsData } = parseCsvData(csvPath);
  console.log(`✅ ${weeks.length}개의 Week 정보 파싱 완료`);
  console.log(`✅ ${programsData.length}개의 Program 데이터 파싱 완료`);

  // syllabusId 추출 (CSV에서 하나의 syllabus만 사용한다고 가정)
  const syllabusId = weeks[0]?.syllabusId;
  if (!syllabusId) {
    console.error('🔴 syllabusId를 찾을 수 없습니다.');
    return;
  }

  // Week 매핑 생성 (weekNumber -> weekId)
  let weekMapping;
  try {
    weekMapping = await buildWeekMapping(syllabusId, weeks, token);
  } catch (err) {
    console.error('\n🔴 Week 매핑 생성 실패:', err.message);
    return;
  }

  console.log(`\n✅ Week 매핑 완료`);

  // programsData를 CreateProgramDto 형식으로 변환 (weekId 사용)
  const programs = programsData.map((data) => {
    const weekId = weekMapping.get(data.week);
    if (!weekId) {
      throw new Error(
        `Week ${data.week}에 대한 weekId를 찾을 수 없습니다.`,
      );
    }

    return {
      weekId,
      name: data.name,
      type: data.type,
      tags: data.tags,
      level: data.level,
      isScorable: data.isScorable,
      captions: data.captions,
    };
  });

  console.log('\n📋 처음 3개 프로그램 샘플:');
  programs.slice(0, 3).forEach((p, idx) => {
    console.log(`\n[${idx + 1}] ${p.name}`);
    console.log(`  - weekId: ${p.weekId}`);
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
