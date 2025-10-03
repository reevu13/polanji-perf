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
  if (!match?.courseId) fail('No course with quizzes found for progress test');
  const courseId = match.courseId;

  const enrollRes = http.post(
    `${BASE_URL}/enroll`,
    JSON.stringify({ course_id: courseId, user_id: auth.userId }),
    {
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      tags: { endpoint: '/enroll' },
    }
  );
  check(enrollRes, {
    enrolled: (r) => r.status === 200 || r.status === 201 || r.status === 409,
  });

  return {
    baseUrl: BASE_URL,
    headers: auth.headers,
    course_id: courseId,
    user_id: auth.userId,
  };
}

export default function (ctx) {
  group('PUT /courses/update_progress', () => {
    const progressRes = http.put(
      `${ctx.baseUrl}/courses/update_progress`,
      JSON.stringify({ course_id: ctx.course_id, progress: 25 }),
      {
        headers: { ...ctx.headers, 'Content-Type': 'application/json' },
        tags: { endpoint: '/courses/update_progress' },
      }
    );
    check(progressRes, { 'progress 2xx': (r) => r.status >= 200 && r.status < 300 });
  });
}
