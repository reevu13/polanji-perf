import http from 'k6/http';
import { check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  const coursesRes = http.get(`${BASE_URL}/courses`, { headers: auth.headers });
  check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
  const course = pickFirst(coursesRes.json(), c => c?.id);
  if (!course?.id) fail('No course_id found for details test');
  return { baseUrl: BASE_URL, headers: auth.headers, course_id: course.id };
}

export default function (ctx) {
  const res = http.get(`${ctx.baseUrl}/courses/${ctx.course_id}`, { headers: ctx.headers });
  check(res, { 'details 2xx': r => r.status >= 200 && r.status < 300 });
  const details = res.json();
  // Optional shape checks (best-effort):
  check(details, { 'has course_title': d => typeof d?.course_title === 'string' && d.course_title.length > 0 });
}
