import http from 'k6/http';
import { sleep, check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  return { baseUrl: BASE_URL, headers: auth.headers };
}

export default function (ctx) {
  const { baseUrl, headers } = ctx;

  // 1) List courses → pick a real one
  const coursesRes = http.get(`${baseUrl}/courses`, { headers });
  check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
  const course = pickFirst(coursesRes.json(), c => c?.id);
  if (!course?.id) fail('No course_id found');

  // 2) Enroll
  const enrollRes = http.post(
    `${baseUrl}/enroll`,
    JSON.stringify({ course_id: course.id }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(enrollRes, { enrolled: r => r.status === 200 || r.status === 201 });

  // 3) Update progress (use realistic values)
  const progressRes = http.post(
    `${baseUrl}/courses/update_progress`,
    JSON.stringify({ course_id: course.id, progress: 25 }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(progressRes, { 'progress 2xx': r => r.status >= 200 && r.status < 300 });

  // 4) Quiz complete (stable section index)
  const section_index = 0;
  const quizRes = http.post(
    `${baseUrl}/courses/${course.id}/sections/${section_index}/quiz-complete`,
    null,
    { headers }
  );
  check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });

  sleep(1); // realistic pacing
}
