#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [summaryDirArg, outputPathArg] = process.argv.slice(2);
const summaryDir = summaryDirArg || path.join('artifacts', 'summaries');
const outputPath = outputPathArg || path.join('artifacts', 'summary-report.html');

if (!fs.existsSync(summaryDir)) {
  console.error(`Summary directory not found: ${summaryDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(summaryDir)
  .filter(f => f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error(`No summary files found in ${summaryDir}`);
  process.exit(1);
}

const formatMs = value =>
  value != null ? `${Number(value).toFixed(2)} ms` : 'n/a';

const formatRate = value =>
  value != null ? `${(Number(value) * 100).toFixed(2)}%` : 'n/a';

const sections = files.map(file => {
  const fullPath = path.join(summaryDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const metrics = data.metrics || {};

  const pickMetric = (...names) => {
    for (const name of names) {
      if (metrics[name]) return { name, metric: metrics[name] };
    }
    return { name: names[names.length - 1], metric: {} };
  };

  const { name: durationMetricName, metric: httpDuration } = pickMetric(
    'http_req_duration{expected_response:true}',
    'http_req_duration'
  );
  const { name: failedMetricName, metric: httpFailed } = pickMetric(
    'http_req_failed{expected_response:true}',
    'http_req_failed'
  );
  const httpReqs = metrics.http_reqs || {};
  const iterations = metrics.iterations || {};

  const thresholds = [];
  const evaluateThreshold = (metricName, metric, expr) => {
    const match = expr.match(/^([^<>=!]+)\s*(<=|>=|<|>)\s*(.+)$/);
    if (!match) return { metric: metricName, name: expr, passed: null };
    const [, rawKey, operator, rhsRaw] = match;
    const key = rawKey.trim();
    const rhs = Number(rhsRaw.trim());
    const lhs = key === 'rate' ? Number(metric.value) : Number(metric[key]);
    if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) {
      return { metric: metricName, name: expr, passed: null, lhs, rhs };
    }
    let passed;
    switch (operator) {
      case '<':
        passed = lhs < rhs;
        break;
      case '<=':
        passed = lhs <= rhs;
        break;
      case '>':
        passed = lhs > rhs;
        break;
      case '>=':
        passed = lhs >= rhs;
        break;
      default:
        passed = null;
    }
    return { metric: metricName, name: expr, passed, lhs, rhs };
  };

  for (const [metricName, metric] of Object.entries(metrics)) {
    if (metric.thresholds) {
      for (const expr of Object.keys(metric.thresholds)) {
        thresholds.push(evaluateThreshold(metricName, metric, expr));
      }
    }
  }

  const checks = metrics.checks || {};
  const checksSummary =
    checks.passes != null && checks.fails != null
      ? `${checks.passes} passed / ${checks.fails} failed`
      : 'n/a';

  return {
    file,
    httpDuration,
    httpFailed,
    httpReqs,
    iterations,
    thresholds,
    checksSummary,
  };
});

const css = `body { font-family: "Segoe UI", sans-serif; margin: 2rem; background: #f5f7fb; }
h1 { font-size: 1.8rem; }
section { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
section h2 { margin-top: 0; font-size: 1.3rem; }
table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
th, td { padding: 0.6rem 0.8rem; border-bottom: 1px solid #e2e6f0; text-align: left; }
th { background: #eef1f8; font-weight: 600; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; color: #fff; }
.badge.pass { background: #28a745; }
.badge.fail { background: #dc3545; }
.meta { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
.meta div { background: #eef1f8; padding: 0.6rem 0.9rem; border-radius: 6px; font-size: 0.9rem; }
small { color: #65728a; }
`;

const htmlSections = sections
  .map(section => {
    const duration = section.httpDuration;
    const failed = section.httpFailed;
    const reqs = section.httpReqs;
    const iter = section.iterations;

    const thresholdRows = section.thresholds.length
      ? section.thresholds
          .map(t => {
            const status =
              t.passed === true ? 'pass' : t.passed === false ? 'fail' : 'n/a';
            const badgeClass =
              t.passed === true ? 'pass' : t.passed === false ? 'fail' : '';
            const actual = Number.isFinite(t.lhs) ? t.lhs.toFixed(3) : 'n/a';
            return `<tr><td>${t.metric}</td><td>${t.name}</td><td><span class="badge ${badgeClass}">${status}</span>${
              actual !== 'n/a' ? `<small> (actual ${actual})</small>` : ''
            }</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="3"><small>No thresholds defined</small></td></tr>';

    return `
      <section>
        <h2>${section.file}</h2>
        <div class="meta">
          <div><strong>Avg duration:</strong> ${formatMs(duration.avg)}</div>
          <div><strong>p(95) duration:</strong> ${formatMs(duration['p(95)'])}</div>
          <div><strong>Requests:</strong> ${reqs.count ?? 'n/a'}</div>
          <div><strong>Iterations:</strong> ${iter.count ?? 'n/a'}</div>
          <div><strong>Failed rate:</strong> ${formatRate(failed.value)}</div>
          <div><strong>Checks:</strong> ${section.checksSummary}</div>
        </div>
        <table>
          <thead>
            <tr><th>Metric</th><th>Threshold</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${thresholdRows}
          </table>
      </section>
    `;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>k6 Performance Summary</title>
  <style>${css}</style>
</head>
<body>
  <h1>k6 Performance Summary</h1>
  <p><small>Generated ${new Date().toISOString()}</small></p>
  ${htmlSections}
</body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Report written to ${outputPath}`);
