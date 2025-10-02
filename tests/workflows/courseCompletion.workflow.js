import http from 'k6/http';
import { sleep, check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { findCourseWithQuiz } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  const match = findCourseWithQuiz(BASE_URL, auth.headers);
  if (!match?.courseId) fail('No course with quizzes found');

  return {
    baseUrl: BASE_URL,
    headers: auth.headers,
    user_id: auth.userId,
    course_id: match.courseId,
    section_index: match.sectionIndex,
  };
}

export default function (ctx) {
  const { baseUrl, headers, user_id, course_id, section_index } = ctx;

  // 1) Verify courses endpoint remains healthy
  const coursesRes = http.get(`${baseUrl}/courses`, { headers });
  check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });

  // 2) Enroll
  const enrollRes = http.post(
    `${baseUrl}/enroll`,
    JSON.stringify({ course_id, user_id }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(enrollRes, {
    enrolled: r => r.status === 200 || r.status === 201 || r.status === 409,
  });

  // 3) Update progress (PUT)
  const progressRes = http.put(
    `${baseUrl}/courses/update_progress`,
    JSON.stringify({ course_id, progress: 25 }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(progressRes, { 'progress 2xx': r => r.status >= 200 && r.status < 300 });

  // 4) Quiz complete using the discovered section index
  const quizRes = http.post(
    `${baseUrl}/courses/${course_id}/sections/${section_index}/quiz-complete`,
    null,
    { headers }
  );
  check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });

  sleep(1);
}
