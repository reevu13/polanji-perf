import http from 'k6/http';
import { check, group } from 'k6';
import { login } from '../../src/auth.js';
import { options } from '../../k6.options.js';

export { options };

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  return { baseUrl: BASE_URL, headers: auth.headers };
}

export default function (ctx) {
  group('GET /topics', () => {
    const res = http.get(`${ctx.baseUrl}/topics`, {
      headers: ctx.headers,
      tags: { endpoint: '/topics' },
    });
    check(res, { 'topics 2xx': r => r.status >= 200 && r.status < 300 });
    res.json();
  });
}
