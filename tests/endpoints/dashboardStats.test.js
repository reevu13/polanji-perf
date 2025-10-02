import http from 'k6/http';
import { check } from 'k6';
import { login } from '../../src/auth.js';
import { options as baseOptions } from '../../k6.options.js';

export const options = {
  ...baseOptions,
  thresholds: {
    ...baseOptions.thresholds,
    http_req_failed: ['rate<=0.5'],
  },
};

export function setup() {
  const { BASE_URL, EMAIL, PASSWORD } = __ENV;
  const auth = login(BASE_URL, EMAIL, PASSWORD);
  return { baseUrl: BASE_URL, headers: auth.headers };
}

export default function (ctx) {
  const res = http.get(`${ctx.baseUrl}/dashboard/stats`, { headers: ctx.headers });
  check(res, {
    'stats ok': r => (r.status >= 200 && r.status < 300) || r.status === 403,
  });
  res.json();
}
