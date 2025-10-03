const scenarioPresets = {
  load: {
    executor: 'ramping-arrival-rate',
    startRate: 1,
    timeUnit: '1s',
    preAllocatedVUs: 15,
    maxVUs: 20,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 15 },
      { duration: '30s', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 2,
    timeUnit: '1s',
    preAllocatedVUs: 18,
    maxVUs: 22,
    stages: [
      { duration: '30s', target: 8 },
      { duration: '1m', target: 20 },
      { duration: '30s', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-arrival-rate',
    startRate: 1,
    timeUnit: '1s',
    preAllocatedVUs: 18,
    maxVUs: 22,
    stages: [
      { duration: '5s', target: 1 },
      { duration: '10s', target: 20 },
      { duration: '20s', target: 1 },
    ],
  },
  soak: {
    executor: 'constant-arrival-rate',
    rate: 5,
    timeUnit: '1s',
    duration: '3m',
    preAllocatedVUs: 10,
    maxVUs: 15,
  },
};

const scenarioName = (typeof __ENV !== 'undefined' && __ENV.SCENARIO) || 'load';
const selectedScenario = scenarioPresets[scenarioName] || scenarioPresets.load;

export const options = {
  scenarios: {
    [scenarioName]: selectedScenario,
  },
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_duration{expected_response:true}': ['p(95)<800'],
    'http_req_duration{endpoint:/topics}': ['p(95)<400'],
    'http_req_duration{endpoint:/courses}': ['p(95)<450'],
    'http_req_duration{endpoint:/enroll}': ['p(95)<500'],
    'http_req_duration{endpoint:/courses/update_progress}': ['p(95)<500'],
    'http_req_duration{endpoint:/courses/{course_id}}': ['p(95)<500'],
    'http_req_duration{endpoint:/section-quizzes}': ['p(95)<550'],
    'http_req_duration{endpoint:/courses/{course_id}/sections/{section_index}/quiz-complete}': [
      'p(95)<550',
    ],
    'http_req_duration{endpoint:/dashboard/stats}': ['p(95)<600'],
    'http_req_failed{endpoint:/dashboard/stats}': ['rate<=0.5'],
  },
  summaryTrendStats: ['min', 'avg', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
