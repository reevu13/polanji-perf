import http from 'k6/http';
import { sleep, check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  return { baseUrl: BASE_URL, headers: auth.headers, user_id: auth.userId };
}

export default function (ctx) {
  const { baseUrl, headers, user_id } = ctx;

  // 1) Courses → pick one
  const coursesRes = http.get(`${baseUrl}/courses`, { headers });
  check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
  const course = pickFirst(coursesRes.json(), c => c?.id);
  if (!course?.id) fail('No course_id found');

  // 2) Course details → pick a real section index when possible
  const detailsRes = http.get(`${baseUrl}/courses/${course.id}`, { headers });
  let section_index = null;
  if (detailsRes.status >= 200 && detailsRes.status < 300) {
    const details = detailsRes.json();
    const sections = Array.isArray(details?.sections) ? details.sections : [];
    const indexCandidates = ['section_index', 'sectionIndex', 'index', 'order'];
    for (const section of sections) {
      for (const key of indexCandidates) {
        const value = section?.[key];
        if (Number.isInteger(value) && value >= 0) {
          section_index = value;
          break;
        }
      }
      if (Number.isInteger(section_index)) break;
    }
  }
  if (!Number.isInteger(section_index)) section_index = 0;

  // 3) Enroll
  const enrollRes = http.post(
    `${baseUrl}/enroll`,
    JSON.stringify({ course_id: course.id, user_id }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(enrollRes, { enrolled: r => r.status === 200 || r.status === 201 });

  // 4) Update progress (PUT)
  const progressRes = http.put(
    `${baseUrl}/courses/update_progress`,
    JSON.stringify({ course_id: course.id, progress: 25 }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  check(progressRes, { 'progress 2xx': r => r.status >= 200 && r.status < 300 });

  // 5) Quiz complete using the discovered section index
  const quizRes = http.post(
    `${baseUrl}/courses/${course.id}/sections/${section_index}/quiz-complete`,
    null,
    { headers }
  );
  check(quizRes, { 'quiz 2xx': r => r.status >= 200 && r.status < 300 });

  sleep(1);
}
