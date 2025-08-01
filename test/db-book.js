/**
 * 자동화 입력 스크립트
 * how to execute? `node db-book.js`
 */

const url = 'http://localhost:3001/v1';

async function loginAndGetToken() {
  const res = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test@gmail.com',
      password: 'password',
      role: 'MANAGER',
    }),
  });

  const data = await res.json();
  return data.accessToken;
}

async function getOfferings(token) {
  const res = await fetch(`${url}/schools/1/terms/1/offerings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return await res.json();
}

async function getStudents(token, grades) {
  const res = await fetch(`${url}/schools/1/students?isAttending=true&grades=${grades.join(',')}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return await res.json();
}

async function postBookings(offering, students, token) {
  const grades = offering.allowedGrades;
  const matchedStudents = [...students].filter((student) => grades.includes(student.grade));
  const randomStudents = matchedStudents
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  for (const student of randomStudents) {
    const dto = {
      offeringId: offering.id,
      studentId: student.id,
      capacity: offering.capacity,
      pickRule: offering.pickRule,
      lessonName: offering.lessonName,
    };
    try {
      const response = await fetch(`${url}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        const message = await response.text();
        console.error(`🟡`, message);
      } else {
        const result = await response.json();
        console.log(`🟢`, result);
      }
    } catch (err) {
      console.log(err);
      console.error(`🔴`, err.message);
    }
  }
}

async function run() {
  const token = await loginAndGetToken();
  console.log('✅ token', token);

  const offerings = await getOfferings(token);
  console.log('✅ offerings', offerings);

  for (const offering of offerings) {
    const students = await getStudents(token, offering.allowedGrades);
    await postBookings(offering, students, token);
  }
}

run();
