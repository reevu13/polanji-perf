# Polanji Performance Tests (k6)

## Scope (per assignment PDF)
- Endpoints: /topics, /courses, /enroll, /courses/update_progress, /courses/{course_id}/sections/{section_index}/quiz-complete
- Workflow: Course completion (sequence; pass live IDs between steps)
- Test types: Load, Stress, Spike, Soak
- Limits: 5–20 VUs; 1–3 minutes
- No hardcoded credentials; modular; scalable; CI optional; Docker optional

## Prereqs (Manjaro)
```bash
sudo pacman -Syu
sudo pacman -S k6 git curl jq
