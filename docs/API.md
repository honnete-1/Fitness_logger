# API Reference

Base path: `/api/`. JSON in and out. Dates use `YYYY-MM-DD` and timestamps are ISO 8601. Decimal values (weights, distances, entry durations) are returned as strings, for example `"42.50"`.

## Conventions

**Authentication**
- Session cookie (`sessionid`, HttpOnly).
- Unsafe methods (POST, PATCH, DELETE) need the `X-CSRFToken` header, whose value is the `csrftoken` cookie. To obtain the cookie, call `GET /api/auth/csrf/`.

**Status codes**

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | Deleted / logged out |
| `400` | Validation error |
| `401` | Not signed in |
| `403` | Not allowed (for example, editing a built-in exercise, or a missing CSRF token) |
| `404` | Not found, *including another user's records* |
| `405` | Method not allowed (PUT is not supported; use PATCH) |
| `409` | Conflict (deleting an exercise that has been logged) |
| `429` | Too many auth attempts (20/min) |

**Error bodies**
- Field errors: `{"title": ["Give your workout a title."], "entries": [{}, {"sets": ["Add at least one set for Push-ups."]}]}`
- General errors: `{"detail": "Incorrect username/email or password."}`

**Pagination** (on `GET /api/workouts/`): `{"count": 26, "next": "…?page=2", "previous": null, "results": [...]}` with 10 items per page and `?page=N`.

---

## Auth

### `POST /api/auth/register/`
```json
{ "username": "sam", "email": "sam@example.com", "password": "Sunrise-run-42", "password_confirm": "Sunrise-run-42" }
```
**201** returns a [User](#user) object, and the session is now signed in.

Validation:
- The username must be unique (case-insensitive) and follow Django's username rules.
- The email must be valid and unique.
- The passwords must match and pass Django's validators: minimum 8 characters, not common, not all digits, not too similar to the username.

### `POST /api/auth/login/`
```json
{ "identifier": "sam or sam@example.com", "password": "…" }
```
**200** returns a User. **400** returns `{"detail": "Incorrect username/email or password."}`.

### `POST /api/auth/logout/`
**204**

### `GET /api/auth/me/` and `PATCH /api/auth/me/`
<a id="user"></a>
```json
{ "id": 1, "username": "sam", "email": "sam@example.com", "display_name": "Sam",
  "date_joined": "2026-11-20T18:00:00Z", "weekly_workout_target": 3 }
```
PATCH accepts `username`, `email` and `display_name`.

### `GET /api/goals/` and `PATCH /api/goals/`
```json
{ "weekly_workout_target": 4, "updated_at": "…" }
```
The target must be between 1 and 14.

---

## Exercises

### `GET /api/exercises/`
Optional query parameters: `category` (`strength|cardio|flexibility|mobility|bodyweight`), `search`, `measurement_type`, and `custom=true` (only your own exercises).

Returns an unpaginated array containing the built-ins plus your custom exercises:
```json
[{ "id": 1, "name": "Bench press", "description": "…", "category": "strength", "category_label": "Strength",
   "measurement_type": "reps_weight", "measurement_label": "Sets × reps (+ optional weight)",
   "is_custom": false, "created_at": "…" }]
```

### `POST /api/exercises/`
```json
{ "name": "Kettlebell swing", "description": "", "category": "strength", "measurement_type": "reps_weight" }
```
**201.** Names must be unique against the built-ins and against your own exercises (case-insensitive).

### `GET`, `PATCH`, `DELETE /api/exercises/{id}/`
- Built-in exercises are read-only: editing or deleting one returns **403**.
- Another user's custom exercise returns **404**.
- Deleting an exercise that has been logged returns **409**.
- Changing the `measurement_type` of a logged exercise returns **400**.

---

## Workouts

### `GET /api/workouts/`
Query parameters: `page`, `search` (title), `category`, `date_from`, `date_to`. Results are ordered newest first.
```json
{ "count": 1, "next": null, "previous": null, "results": [
  { "id": 7, "title": "Monday Upper Body", "date": "2026-11-16", "duration_minutes": 45,
    "exercise_count": 2, "exercise_names": ["Push-ups", "Dumbbell curl"], "notes_preview": "Felt strong" } ] }
```

### `POST /api/workouts/`
```json
{
  "title": "Monday Upper Body",
  "date": "2026-11-16",
  "notes": "Felt strong",
  "duration_minutes": 45,
  "entries": [
    { "exercise_id": 10, "sets": [{ "reps": 12 }, { "reps": 10 }, { "reps": 8 }] },
    { "exercise_id": 2,  "sets": [{ "reps": 12, "weight_kg": "5" }, { "reps": 10, "weight_kg": "6" }] },
    { "exercise_id": 17, "distance_km": "5.2", "duration_minutes": "28.5", "notes": "Easy pace" },
    { "exercise_id": 13, "duration_minutes": "2" }
  ]
}
```
**201** returns the full [Workout](#workout). The workout and all of its entries and sets are saved atomically.

Rules:

| Field | Rule |
|---|---|
| `title` | Required, at most 100 characters |
| `date` | Valid, no later than today + 1 day, and in 2000 or later |
| `duration_minutes` | Optional whole number, 1–1440 |
| `entries` | 1–30 entries |
| Each entry | Must match its exercise's measurement type ([table](ENGINEERING.md#5-data-model)) |
| Sets | 1–50 per entry; `reps` 1–1000; `weight_kg` 0–1000 |
| `distance_km` | 0.01–1000 |
| Entry `duration_minutes` | 0.01–1440 |

Set numbers are assigned from the position in the list.

### `GET /api/workouts/{id}/`
<a id="workout"></a>
```json
{ "id": 7, "title": "…", "date": "2026-11-16", "notes": "…", "duration_minutes": 45,
  "created_at": "…", "updated_at": "…",
  "entries": [ { "id": 31, "order": 0, "duration_minutes": null, "distance_km": null, "notes": "",
                 "exercise": { "id": 10, "name": "Push-ups", "...": "…" },
                 "sets": [ { "id": 90, "set_number": 1, "reps": 12, "weight_kg": null } ] } ] }
```

### `PATCH /api/workouts/{id}/`
Accepts the same shape as POST, and every field is optional. If `entries` is sent, it **replaces** all existing entries, in one transaction.

### `DELETE /api/workouts/{id}/`
**204.** Entries and sets are deleted with the workout.

---

## Statistics

The statistics endpoints accept `?today=YYYY-MM-DD`, the client's local date. It is accepted within ±1 day of the server date. Weeks run Monday to Sunday.

### `GET /api/dashboard/summary/`
```json
{ "today": "2026-11-20", "week": { "start": "2026-11-16", "end": "2026-11-22" },
  "total_workouts": 27, "workouts_this_week": 2, "total_duration_minutes": 1090,
  "workouts_with_duration": 27, "total_logged_exercises": 67,
  "goal": { "weekly_target": 3, "completed": 2, "remaining": 1, "streak_weeks": 6 },
  "last_7_days": { "period": { "start": "2026-11-14", "end": "2026-11-20" },
                   "days": [ { "date": "2026-11-14", "weekday": "Sat", "workouts": 0 } ] },
  "recent_workouts": [ /* up to 5 workout summaries */ ] }
```

### `GET /api/progress/weekly/`
```json
{ "today": "…", "period": { "start": "2026-11-16", "end": "2026-11-22" },
  "days": [ { "date": "2026-11-16", "weekday": "Mon", "workouts": 1 } ],
  "total_workouts": 2, "active_days": 2 }
```

### `GET /api/progress/trends/?weeks=8`
`weeks` must be between 1 and 26. The result covers that many weeks, ending with the current week.
```json
{ "period": { "start": "2026-09-28", "end": "2026-11-22" },
  "weeks": [ { "week_start": "2026-09-28", "week_end": "2026-10-04", "workouts": 1, "logged_exercises": 3, "duration_minutes": 50 } ],
  "total_workouts": 26, "average_per_week": 3.2, "active_weeks": 8, "weekly_target": 3,
  "categories": [ { "category": "strength", "label": "Strength", "logged_exercises": 20 } ],
  "top_exercises": [ { "exercise_id": 1, "name": "Bench press", "category": "strength", "times": 6 } ],
  "all_time": { "total_workouts": 27, "total_duration_minutes": 1090, "workouts_with_duration": 27, "total_logged_exercises": 67 } }
```
