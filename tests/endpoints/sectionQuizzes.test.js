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
  if (!match?.courseId) {
    return { baseUrl: BASE_URL, headers: auth.headers, skip: true };
  }

  return {
    baseUrl: BASE_URL,
    headers: auth.headers,
    course_id: match.courseId,
    section_index: match.sectionIndex,
    skip: false,
  };
}

export default function (ctx) {
  const { baseUrl, headers, course_id, section_index, skip } = ctx;

  if (skip) {
    // Nothing to exercise if the course exposes no sections
    return;
  }

  const url = `${baseUrl}/section-quizzes?course_id=${course_id}&section_index=${section_index}`;
  const res = http.get(url, { headers, tags: { endpoint: url } });
  check(res, { 'section-quizzes 2xx': r => r.status >= 200 && r.status < 300 });
  res.json();
}
