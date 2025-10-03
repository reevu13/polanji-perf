import http from 'k6/http';
import { sleep, check, fail, group } from 'k6';
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

  group('GET /courses', () => {
    const coursesRes = http.get(`${baseUrl}/courses`, {
      headers,
      tags: { endpoint: '/courses' },
    });
    check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
  });

  group('POST /enroll', () => {
    const enrollRes = http.post(
      `${baseUrl}/enroll`,
      JSON.stringify({ course_id, user_id }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        tags: { endpoint: '/enroll' },
      }
    );
    check(enrollRes, {
      enrolled: r => r.status === 200 || r.status === 201 || r.status === 409,
    });
  });

  group('PUT /courses/update_progress', () => {
    const progressRes = http.put(
      `${baseUrl}/courses/update_progress`,
      JSON.stringify({ course_id, progress: 25 }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        tags: { endpoint: '/courses/update_progress' },
      }
    );
    check(progressRes, { 'progress 2xx': r => r.status >= 200 && r.status < 300 });
  });

  group('POST /courses/{course_id}/sections/{section_index}/quiz-complete', () => {
    const quizRes = http.post(
      `${baseUrl}/courses/${course_id}/sections/${section_index}/quiz-complete`,
      null,
      {
        headers,
        tags: { endpoint: '/courses/{course_id}/sections/{section_index}/quiz-complete' },
      }
    );
    check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });
  });

  sleep(1);
}
