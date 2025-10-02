import http from 'k6/http';
import { check, fail } from 'k6';

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

export function apiPut(url, payload, headers = {}) {
  const res = http.put(
    url,
    payload === null ? null : JSON.stringify(payload),
    { headers: { 'Content-Type': 'application/json', ...headers }, tags: { endpoint: url } }
  );
  check(res, { '2xx': r => r.status >= 200 && r.status < 300 });
  return res;
}

// Try multiple candidate URLs; return the first 2xx or fail.
export function apiGetFirst2xx(urls, headers = {}) {
  for (const url of urls) {
    const res = http.get(url, { headers, tags: { endpoint: url } });
    if (res.status >= 200 && res.status < 300) return res;
  }
  fail(`No 2xx among candidates:\n${urls.join('\n')}`);
}