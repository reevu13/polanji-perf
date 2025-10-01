export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],   // <1% errors
    http_req_duration: ['p(95)<800'], // 95th < 800ms
  },
  summaryTrendStats: ['min','avg','p(90)','p(95)','max'],
};
