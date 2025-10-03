# Performance Test Architecture

```mermaid
flowchart TD
    A[Test Runner (k6 CLI)] -->|uses| B[Scripts in tests/]
    B -->|authenticates| C[/log_in]
    B -->|reads| D[/courses]
    B -->|posts| E[/enroll]
    B -->|puts| F[/courses/update_progress]
    B -->|posts| G[/courses/{course_id}/sections/{section_index}/quiz-complete]
    B -->|gets| H[/section-quizzes]
    A -->|exports summaries| I[artifacts/summaries/*.json]
    I -->|render-report.js| J[HTML Summary]
    J -->|uploaded by GitHub Actions| K[(Workflow Artifact)]
    B -->|validates persisted data| L[(Postgres smart_learning)]
```

**Flow summary**

1. `scripts/run-full-suite.sh` logs in, executes all endpoint scripts, and the workflow scenario under a shared ramping-arrival-rate executor.
2. Every HTTP request is tagged with the canonical endpoint name, enabling per-route thresholds and cleaner reports.
3. k6 emits JSON trend summaries (`min`, `avg`, `p(90)`, `p(95)`, `p(99)`, `max`) for each scenario.
4. `scripts/render-report.js` converts those JSON files into `artifacts/summary-report.html` with threshold badges and actual values.
5. `scripts/db-validate.js` cross-checks the latest quiz completion against the `course_interactions`, `course_section_quiz_progress`, and `section_quizzes` tables.
6. GitHub Actions builds the Docker image, runs the suite, uploads the `artifacts/` folder, and exposes `summary-report.html` for download.
