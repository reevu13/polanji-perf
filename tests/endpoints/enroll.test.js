import http from 'k6/http';
import { check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  // get a real course_id
  const courses = http.get(`${BASE_URL}/courses`, { headers: auth.headers }).json();
  const course = pickFirst(courses, c => c?.id);
  if (!course) fail('No course found for enrollment');
  return { baseUrl: BASE_URL, headers: auth.headers, course_id: course.id };
}

export default function (ctx) {
  const res = http.post(
    `${ctx.baseUrl}/enroll`,
    JSON.stringify({ course_id: ctx.course_id }),
    { headers: { ...ctx.headers, 'Content-Type': 'application/json' } }
  );
  check(res, { 'enroll ok': r => r.status === 200 || r.status === 201 });
}
