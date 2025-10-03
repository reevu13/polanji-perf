import http from 'k6/http';
import { check, fail, sleep } from 'k6';

export function login(baseUrl, email, password) {
  const url = `${baseUrl}/log_in`;
  const payload = {
    username: email,
    password: password,
    grant_type: 'password',
  };
  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    tags: { endpoint: '/log_in' },
  };

  let lastError = 'unknown error';

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = http.post(url, payload, params);
    const ok = res.status >= 200 && res.status < 300;

    check(res, { 'login 2xx': () => ok });

    if (ok) {
      try {
        const body = res.json();
        const token = body?.access_token;
        const type = (body?.token_type || 'bearer').toLowerCase();
        const user = body?.user;

        if (!token) {
          lastError = 'No access_token in /log_in response';
        } else if (!user?.id) {
          lastError = 'No user.id in /log_in response';
        } else {
          const authHeader = `${type === 'bearer' ? 'Bearer' : type} ${token}`;
          return { headers: { Authorization: authHeader }, user, userId: user.id };
        }
      } catch (err) {
        lastError = `Invalid JSON response: ${err.message}`;
      }
    } else {
      lastError = `status=${res.status} body=${res.body?.slice(0, 200)}`;
    }

    if (attempt < 3) sleep(1);
  }

  fail(`Login failed: ${lastError}`);
}
