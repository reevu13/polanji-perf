# Polanji Performance Tests (k6)

## Scope (per assignment PDF)
- Endpoints: /topics, /courses, /enroll, /courses/update_progress, /courses/{course_id}/sections/{section_index}/quiz-complete
- Workflow: Course completion (sequence; pass live IDs between steps)
- Test types: Load, Stress, Spike, Soak
- Limits: 5–20 VUs; 1–3 minutes
- No hardcoded credentials; modular; scalable; CI optional; Docker optional

## Prereqs

**Arch**
```bash
sudo pacman -Syu
sudo pacman -S k6 git curl jq nodejs npm
```

**Debian / Ubuntu**
```bash
sudo apt-get update
sudo apt-get install -y gnupg2 ca-certificates curl git jq nodejs npm
curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install -y k6
```

**macOS (Homebrew)**
```bash
brew update
brew install k6 node jq git
```

**Windows (PowerShell, chocolatey)**
```powershell
choco install -y git nodejs jq
choco install -y k6
```

## Running the test suite

Export real credentials via `BASE_URL`, `EMAIL`, and `PASSWORD`, then call `k6 run` directly for each profile:

- **Load**

  ```bash
  BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
    k6 run --vus 10 --duration 2m tests/workflows/courseCompletion.workflow.js
  ```

- **Stress**

  ```bash
  BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
    k6 run --stage 30s:5 --stage 1m:20 --stage 30s:5 tests/workflows/courseCompletion.workflow.js
  ```

- **Spike**

  ```bash
  BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
    k6 run --stage 5s:1 --stage 10s:20 --stage 20s:1 tests/endpoints/topics.test.js
  ```

- **Soak**

  ```bash
  BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
    k6 run --vus 5 --duration 3m tests/endpoints/courses.test.js
  ```

`k6` treats staged ramps as mutually exclusive with fixed-duration execution, so do not add `--duration` when using `--stage`.

To execute the full catalogue (all endpoint tests plus workflows) in one sweep, either loop in Bash:

```bash
while read file; do
  BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
    k6 run "$file"
done < <(find tests -maxdepth 2 -type f \( -name '*.test.js' -o -name '*.workflow.js' \) | sort)
```

…or use the convenience wrapper (which simply invokes `k6 run` for every file and forwards any extra flags):

```bash
BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
  scripts/run-all-tests.sh [k6 options]
```

Or run everything—including DB validation—with a single helper:

```bash
BASE_URL=https://api.polanji.com EMAIL=you@example.com PASSWORD=secret \
  scripts/run-full-suite.sh
```

The script executes load, stress, spike, and soak profiles; runs the remaining endpoint smoke tests; then calls the DB validator below.

## Database validation

Once the HTTP tests have run, validate the persisted state directly against PostgreSQL:

```bash
EMAIL=you@example.com node scripts/db-validate.js
```

The script uses the shared credentials (or override via `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGPORT`) to assert:
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
  -e EMAIL=you@example.com \
  -e PASSWORD=secret \
  -e PGHOST=206.189.138.9 \
  -e PGDATABASE=smart_learning \
  -e PGUSER=postgres \
  -e PGPASSWORD=5wyil5uYsr1W \
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
- `PERF_DB_PORT` (optional, defaults to 5432)

The job invokes the same containerized command shown above, ensuring consistent results locally and in CI.
