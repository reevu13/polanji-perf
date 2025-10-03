import http from 'k6/http';
import { check, fail, group } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { findCourseWithQuiz } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  // get a real course_id
  const match = findCourseWithQuiz(BASE_URL, auth.headers, { maxSections: 3 });
  if (!match?.courseId) fail('No course found for enrollment');
  return {
    baseUrl: BASE_URL,
    headers: auth.headers,
    course_id: match.courseId,
    user_id: auth.userId,
  };
}

export default function (ctx) {
  group('POST /enroll', () => {
    const res = http.post(
      `${ctx.baseUrl}/enroll`,
      JSON.stringify({ course_id: ctx.course_id, user_id: ctx.user_id }),
      {
        headers: { ...ctx.headers, 'Content-Type': 'application/json' },
        tags: { endpoint: '/enroll' },
      }
    );
    check(res, {
      'enroll ok': (r) => r.status === 200 || r.status === 201 || r.status === 409,
    });
  });
}
