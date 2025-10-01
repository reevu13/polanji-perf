import http from 'k6/http';
import { check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  const courses = http.get(`${BASE_URL}/courses`, { headers: auth.headers }).json();
  const course = pickFirst(courses, c => c?.id);
  if (!course?.id) fail('No course_id found');

  return { baseUrl: BASE_URL, headers: auth.headers, course_id: course.id };
}

export default function (ctx) {
  const section_index = 0; // keep deterministic as the PDF warns against randoms
  const quizRes = http.post(
    `${ctx.baseUrl}/courses/${ctx.course_id}/sections/${section_index}/quiz-complete`,
    null,
    { headers: ctx.headers }
  );
  check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });
}
