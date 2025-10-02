export const options = {
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_duration{expected_response:true}': ['p(95)<800'],
  },
  summaryTrendStats: ['min','avg','p(90)','p(95)','max'],
};
