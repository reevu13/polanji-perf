#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?BASE_URL is required}"
: "${EMAIL:?EMAIL is required}"
: "${PASSWORD:?PASSWORD is required}"

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

declare -a COMMANDS=(
  "k6 run --vus 10 --duration 2m tests/workflows/courseCompletion.workflow.js"
  "k6 run --stage 30s:5 --stage 1m:20 --stage 30s:5 tests/workflows/courseCompletion.workflow.js"
  "k6 run --stage 5s:1 --stage 10s:20 --stage 20s:1 tests/endpoints/topics.test.js"
  "k6 run --vus 5 --duration 3m tests/endpoints/courses.test.js"
  "k6 run tests/endpoints/enroll.test.js"
  "k6 run tests/endpoints/progress.test.js"
  "k6 run tests/endpoints/courseDetails.test.js"
  "k6 run tests/endpoints/sectionQuizzes.test.js"
  "k6 run tests/endpoints/quizComplete.test.js"
  "k6 run tests/endpoints/dashboardStats.test.js"
)

for cmd in "${COMMANDS[@]}"; do
  echo "\n=> ${cmd}\n" >&2
  eval "${cmd}"
  echo >&2
  sleep 1

done

echo "\n=> Database validation\n" >&2
node scripts/db-validate.js
