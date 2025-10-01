import http from 'k6/http';
import { check, fail } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  // Assume you already know a stable course_id from /courses:
  const course_id = JSON.parse(open(__ENV.COURSE_ID_JSON || 'null') || 'null') || null; // optional pattern
  return { baseUrl: BASE_URL, headers: auth.headers, course_id };
}

export default function (ctx) {
  // For a self-contained test, you can fetch a course again here too.
  const progressRes = http.post(
    `${ctx.baseUrl}/courses/update_progress`,
    JSON.stringify({ course_id: ctx.course_id, progress: 25 }),
    { headers: { ...ctx.headers, 'Content-Type': 'application/json' } }
  );
  check(progressRes, { 'progress 2xx': r => r.status >= 200 && r.status < 300 });
}
