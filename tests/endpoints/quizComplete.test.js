import http from 'k6/http';
import { check, fail } from 'k6';
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
    course_id: match.courseId,
    section_index: match.sectionIndex,
  };
}

export default function (ctx) {
  const quizRes = http.post(
    `${ctx.baseUrl}/courses/${ctx.course_id}/sections/${ctx.section_index}/quiz-complete`,
    null,
    { headers: ctx.headers }
  );
  check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });
}
