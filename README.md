# Polanji Performance Tests (k6)

## Scope
- Endpoints: /topics, /courses, /enroll, /courses/update_progress, /courses/{course_id}/sections/{section_index}/quiz-complete
- Workflow: Course completion (sequence; pass live IDs between steps)
- Profiles: Load, Stress, Spike, Soak (5–20 VUs, 1–3 minutes)
- Framework: modular k6 scripts, reusable helpers, DB validation, Docker + CI ready

## Prerequisites

| Platform | Commands |
| --- | --- |
| Arch / Manjaro | `sudo pacman -Syu`<br>`sudo pacman -S k6 git curl jq nodejs npm` |
| Debian / Ubuntu | `sudo apt-get update`<br>`sudo apt-get install -y gnupg2 ca-certificates curl git jq nodejs npm`<br>`curl -fsSL https://dl.k6.io/key.gpg \| sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg`<br>`echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \| sudo tee /etc/apt/sources.list.d/k6.list`<br>`sudo apt-get update && sudo apt-get install -y k6` |
| macOS (Homebrew) | `brew update`<br>`brew install k6 node jq git` |
| Windows (PowerShell + chocolatey) | `choco install -y git nodejs jq`<br>`choco install -y k6` |

## Running the test suite

Set your credentials once per shell session:

```bash
export BASE_URL=https://api.polanji.com
export EMAIL=<your_user_email>
export PASSWORD=<your_password>
```

### Single profile runs

| Profile | Command |
| --- | --- |
| Load  | `k6 run --vus 10 --duration 2m tests/workflows/courseCompletion.workflow.js` |
| Stress | `k6 run --stage 30s:5 --stage 1m:20 --stage 30s:5 tests/workflows/courseCompletion.workflow.js` |
| Spike | `k6 run --stage 5s:1 --stage 10s:20 --stage 20s:1 tests/endpoints/topics.test.js` |
| Soak  | `k6 run --vus 5 --duration 3m tests/endpoints/courses.test.js` |

> `k6` scheduling is either ramped (`--stage`) or fixed-duration (`--duration`); avoid combining them in one command.

### Run every script

- **Bash loop** – `find tests -maxdepth 2 -type f \( -name '*.test.js' -o -name '*.workflow.js' \) | sort | xargs -I{} k6 run {}`
- **Wrapper** – `scripts/run-all-tests.sh [k6 options]`
- **Full suite + DB validation** – `scripts/run-full-suite.sh`

## Database validation

Once the HTTP tests have run, validate the persisted state directly against PostgreSQL:

```bash
export PGHOST=<your_db_host>
export PGDATABASE=<your_db_name>
export PGUSER=<your_db_user>
export PGPASSWORD=<your_db_password>
EMAIL=<your_user_email> node scripts/db-validate.js
```

`PGHOST`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` are required. Override them for other environments. The script asserts:
- `topics`/`courses` tables contain data.
- The user exists and has an enrollment in `course_interactions`.
- Course progress is recorded and quiz completion is stored in `course_section_quiz_progress`.
- Section quizzes exist for the enrolled course.

## Export a JSON summary for reports
k6 run --summary-export out.json tests/workflows/courseCompletion.workflow.js
jq . out.json | less

## Dockerized execution

Build the container image (includes Node.js, k6, and dependencies) and run the full suite inside it:

```bash
docker build -t polanji-perf .
docker run --rm \
  -e BASE_URL=https://api.polanji.com \
  -e EMAIL=<your_user_email> \
  -e PASSWORD=<your_password> \
  -e PGHOST=<your_db_host> \
  -e PGDATABASE=<your_db_name> \
  -e PGUSER=<your_db_user> \
  -e PGPASSWORD=<your_db_password> \
  polanji-perf
```

Override the env vars as needed for other environments. The container’s default command is `scripts/run-full-suite.sh`.

## CI/CD (GitHub Actions)

The workflow in `.github/workflows/performance.yml` builds the Docker image and runs the full suite on a nightly schedule and on manual dispatch. Configure the following repository secrets before enabling it:

- `PERF_BASE_URL`
- `PERF_EMAIL`
- `PERF_PASSWORD`
- `PERF_DB_HOST`
- `PERF_DB_NAME`
- `PERF_DB_USER`
- `PERF_DB_PASSWORD`

The job invokes the same containerized command shown above, ensuring consistent results locally and in CI.
