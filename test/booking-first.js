/**
 * 자동화 입력 스크립트
 * how to execute? `node booking-first.js`
 */

const url = 'http://localhost:3001/v1';
const data = [
  {
    offeringId: 9,
    studentId: 1,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 2,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 3,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 4,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 5,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 6,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 7,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 8,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 9,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 10,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 11,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 12,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 13,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 14,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 15,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 16,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 17,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 18,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 19,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
  {
    offeringId: 9,
    studentId: 20,
    capacity: 16,
    pickRule: 'FIRST',
    lessonName: '중국어',
  },
];

async function loginAndGetToken() {
  const res = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '01094867415',
      password: 'password',
      role: 'PARENT',
    }),
  });

  const data = await res.json();
  console.log('data', data);
  return data.accessToken; // 실제 응답 구조에 따라 조정
}

async function run() {
  const token = await loginAndGetToken();
  console.log('token', token);
  for (const item of data) {
    try {
      const response = await fetch(`${url}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ Error for studentId ${item.studentId}:`,
          response.status,
          errorText,
        );
      } else {
        const result = await response.json();
        console.log(`✅ Success for studentId ${item.studentId}:`, result);
      }
    } catch (err) {
      console.error(
        `❗ Network error for studentId ${item.studentId}:`,
        err.message,
      );
    }
  }
}

run();
