#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

EXTRA_ARGS=("$@")

mapfile -t FILES < <(find tests -maxdepth 2 -type f \( -name '*.test.js' -o -name '*.workflow.js' \) | sort)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No k6 test files found." >&2
  exit 1
fi

for file in "${FILES[@]}"; do
  echo "Running ${file}" >&2
  if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
    k6 run "${EXTRA_ARGS[@]}" "$file"
  else
    k6 run "$file"
  fi
  echo
done
