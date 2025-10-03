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
suite_status=0

mkdir -p "$SUMMARY_DIR"

run_k6() {
  local name=$1
  local scenario=$2
  local script=$3
  shift 3 || true
  local summary_file="$SUMMARY_DIR/${name}.json"
  echo "\n=> SCENARIO=${scenario} k6 run ${script} (summary → ${summary_file})\n" >&2
  set +e
 SCENARIO=$scenario k6 run "$script" --summary-export "$summary_file"
  local status=$?
  set -e
  if (( status != 0 )); then
    echo "WARN: k6 exited with status ${status} for ${script} (scenario ${scenario})." >&2
    suite_status=1
  fi
  echo >&2
}

# Full workflow profiles
run_k6 load-workflow load tests/workflows/courseCompletion.workflow.js
run_k6 stress-workflow stress tests/workflows/courseCompletion.workflow.js
run_k6 spike-workflow spike tests/workflows/courseCompletion.workflow.js
run_k6 soak-workflow soak tests/workflows/courseCompletion.workflow.js

# Endpoint spot checks (use load scenario by default)
run_k6 topics load tests/endpoints/topics.test.js
run_k6 courses load tests/endpoints/courses.test.js
run_k6 enroll load tests/endpoints/enroll.test.js
run_k6 progress load tests/endpoints/progress.test.js
run_k6 course-details load tests/endpoints/courseDetails.test.js
run_k6 section-quizzes load tests/endpoints/sectionQuizzes.test.js
run_k6 quiz-complete load tests/endpoints/quizComplete.test.js
run_k6 dashboard load tests/endpoints/dashboardStats.test.js

echo "\n=> Database validation\n" >&2
db_status=0
node scripts/db-validate.js || db_status=$?

node scripts/render-report.js "$SUMMARY_DIR" "$REPORT_HTML"
echo "\nSummary report generated at: $REPORT_HTML\n" >&2

if (( db_status != 0 )); then
  suite_status=1
fi

exit $suite_status
