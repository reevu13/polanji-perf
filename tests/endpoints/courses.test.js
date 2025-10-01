import http from 'k6/http';
import { check } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  return { baseUrl: BASE_URL, headers: auth.headers };
}

export default function (ctx) {
  const res = http.get(`${ctx.baseUrl}/courses`, { headers: ctx.headers });
  check(res, { 'courses 2xx': r => r.status >= 200 && r.status < 300 });
}
