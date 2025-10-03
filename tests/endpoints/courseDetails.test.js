import http from 'k6/http';
import { check, fail, group } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { findCourseWithQuiz } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  const match = findCourseWithQuiz(BASE_URL, auth.headers);
  if (!match?.courseId) fail('No course found for details test');
  return { baseUrl: BASE_URL, headers: auth.headers, course_id: match.courseId };
}

export default function (ctx) {
  group(`GET /courses/${ctx.course_id}`, () => {
    const res = http.get(`${ctx.baseUrl}/courses/${ctx.course_id}`, {
      headers: ctx.headers,
      tags: { endpoint: '/courses/{course_id}' },
    });
    check(res, { 'details 2xx': r => r.status >= 200 && r.status < 300 });
    const details = res.json();
    check(details, {
      'has course_title': d => typeof d?.course_title === 'string' && d.course_title.length > 0,
    });
  });
}
