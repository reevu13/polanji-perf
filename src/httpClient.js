import http from 'k6/http';
import { check } from 'k6';

// GET with tagging and a simple 2xx check
export function apiGet(url, headers={}) {
  const res = http.get(url, { headers, tags: { endpoint: url } });
  check(res, { '2xx': r => r.status >= 200 && r.status < 300 });
  return res;
}

// POST JSON by default
export function apiPost(url, payload, headers={}) {
  const res = http.post(
    url,
    payload === null ? null : JSON.stringify(payload),
    { headers: { 'Content-Type': 'application/json', ...headers }, tags: { endpoint: url } }
  );
  check(res, { '2xx': r => r.status >= 200 && r.status < 300 });
  return res;
}
