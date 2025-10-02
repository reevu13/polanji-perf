#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?BASE_URL is required}"
: "${EMAIL:?EMAIL is required}"
: "${PASSWORD:?PASSWORD is required}"

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

ARTIFACT_DIR=${ARTIFACT_DIR:-artifacts}
SUMMARY_DIR=${SUMMARY_DIR:-$ARTIFACT_DIR/summaries}
REPORT_HTML=${REPORT_HTML:-$ARTIFACT_DIR/summary-report.html}

mkdir -p "$SUMMARY_DIR"

run_k6() {
  local name=$1
  shift
  local summary_file="$SUMMARY_DIR/${name}.json"
  echo "\n=> k6 run $* (summary → ${summary_file})\n" >&2
  k6 run "$@" --summary-export "$summary_file"
  echo >&2
}

run_k6 load --vus 10 --duration 2m tests/workflows/courseCompletion.workflow.js
run_k6 stress --stage 30s:5 --stage 1m:20 --stage 30s:5 tests/workflows/courseCompletion.workflow.js
run_k6 spike --stage 5s:1 --stage 10s:20 --stage 20s:1 tests/endpoints/topics.test.js
run_k6 soak --vus 5 --duration 3m tests/endpoints/courses.test.js

run_k6 enroll tests/endpoints/enroll.test.js
run_k6 progress tests/endpoints/progress.test.js
run_k6 course-details tests/endpoints/courseDetails.test.js
run_k6 section-quizzes tests/endpoints/sectionQuizzes.test.js
run_k6 quiz-complete tests/endpoints/quizComplete.test.js
run_k6 dashboard tests/endpoints/dashboardStats.test.js

echo "\n=> Database validation\n" >&2
db_status=0
node scripts/db-validate.js || db_status=$?

node scripts/render-report.js "$SUMMARY_DIR" "$REPORT_HTML"
echo "\nSummary report generated at: $REPORT_HTML\n" >&2

exit $db_status
