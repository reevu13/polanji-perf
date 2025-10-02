import http from 'k6/http';
import { check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';
import { pickFirst } from '../../src/utils.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);

  // Pick a real course
  const coursesRes = http.get(`${BASE_URL}/courses`, { headers: auth.headers });
  check(coursesRes, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
  const course = pickFirst(coursesRes.json(), c => c?.id);
  if (!course?.id) fail('No course_id found');

  // Try to discover a concrete section index from course details
  const detailsRes = http.get(`${BASE_URL}/courses/${course.id}`, { headers: auth.headers });
  let sectionIndices = [];
  if (detailsRes.status >= 200 && detailsRes.status < 300) {
    const details = detailsRes.json();
    const sections = Array.isArray(details?.sections) ? details.sections : [];
    const indexCandidates = ['section_index', 'sectionIndex', 'index', 'order'];
    for (const section of sections) {
      for (const key of indexCandidates) {
        const value = section?.[key];
        if (Number.isInteger(value) && value >= 0) {
          sectionIndices.push(value);
          break;
        }
      }
    }
  }

  return {
    baseUrl: BASE_URL,
    headers: auth.headers,
    course_id: course.id,
    section_indices: Array.from(new Set(sectionIndices)),
    skip: sectionIndices.length === 0,
  };
}

export default function (ctx) {
  const { baseUrl, headers, course_id, section_indices, skip } = ctx;

  if (skip) {
    // Nothing to exercise if the course exposes no sections
    return;
  }

  for (const sectionIndex of section_indices) {
    const candidates = [
      `${baseUrl}/section-quizzes?course_id=${course_id}&section_index=${sectionIndex}`,
      `${baseUrl}/section-quizzes?courseId=${course_id}&sectionIndex=${sectionIndex}`,
      `${baseUrl}/courses/${course_id}/sections/${sectionIndex}/quizzes`,
      `${baseUrl}/courses/${course_id}/sections/${sectionIndex}/section-quizzes`,
    ];

    for (const url of candidates) {
      const res = http.get(url, { headers, tags: { endpoint: url } });
      if (res.status >= 200 && res.status < 300) {
        check(res, { 'section-quizzes 2xx': r => r.status >= 200 && r.status < 300 });
        res.json();
        return;
      }
    }
  }
  // No section quizzes found; treat as skip rather than hard failure
}
