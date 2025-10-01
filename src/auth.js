import http from 'k6/http';
import { check, fail } from 'k6';

export function login(baseUrl, email, password) {
  const url = `${baseUrl}/log_in`;
  const payload = {
    username: email,
    password: password,
    grant_type: 'password',
  };
  const params = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };

  // k6 will form-encode an object when this Content-Type is set
  const res = http.post(url, payload, params);
  check(res, { 'login 2xx': r => r.status >= 200 && r.status < 300 });

  const body = res.json();
  const token = body?.access_token;
  const type  = (body?.token_type || 'bearer').toLowerCase();

  if (!token) fail('No access_token in /log_in response');

  return { headers: { Authorization: `${type === 'bearer' ? 'Bearer' : type} ${token}` } };
}
