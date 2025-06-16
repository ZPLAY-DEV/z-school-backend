/**
 * 자동화 입력 스크립트
 * how to execute? `node booking-anyone.js`
 */

const url = 'http://localhost:3001/v1';
const data = [
  {
    offeringId: 30,
    studentId: 31,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 32,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 33,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 34,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 35,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 36,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 37,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 38,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 39,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
  },
  {
    offeringId: 30,
    studentId: 40,
    capacity: 0,
    pickRule: 'ANYONE',
    lessonName: '창의교실A',
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
