# Local Demo

Runs the whole Outdoor Trip Companion on one machine with Docker only: no Java, Node, Maven, OpenAI key, or manual Keycloak setup.

## Requirements

- Docker Desktop (or Docker Engine) with Compose v2, at least 6 GB of memory for Docker
- Free ports **3000** (application) and **8181** (sign-in); change them in `.env.demo` if needed
- Internet for the first build (base images, Maven and npm packages), map tiles, and real weather

## Start and stop

```bash
scripts/demo-up.sh            # build, start, wait until healthy, add example data (first run: several minutes)
scripts/demo-down.sh          # stop; data is kept
scripts/demo-down.sh --reset  # stop and delete the demo's data (asks first)
```

Then open **http://localhost:3000**.

| Account | Password | Contents |
|---|---|---|
| `demo` | `demo-password` | Example gear, one upcoming Plan, two past Plans, two Memories (one public) |
| `demo2` | `demo-password` | Empty, to show that each account sees only its own data |

New accounts can also be registered from the sign-in page. Keycloak admin console: http://localhost:8181/admin (`admin` / `admin-demo`).

## Suggested walkthrough

1. **Discover** (signed out): Hero → Explore trails → map and list → a trail popup with activity. Quarry Rock shows the example public memory under Community Memories.
2. **Sign in to plan this trip** → sign in as `demo` → you land on that trail's Trail Detail.
3. **Planner** (brand link): e.g. "a moderate hike with a lake view, around three hours" → recommendations.
4. **Choose this trail** → Trip Preparation (weather, recommended gear, Owned / Missing) → **Gear up** → Gear Studio → equip gear on the avatar → **Finish preparation**.
5. **My Plans**: upcoming and past Plans with the calendar. Past Quarry Rock → **View memory**; past Grouse Grind → **Add memory** with the trail and date filled in.
6. **My Memories** and **My Gear**; sign in as `demo2` to see an empty, separate account.

## What runs

```text
browser ──► edge :3000 ──► /api/planner, /api/recommendations/pack ─► recommendation-service ─► external-mocks (OpenAI)
   │                       /api/trails ──────────────────────────────► trail-service             Open-Meteo (real by default)
   │                       /api/users/me/gear ───────────────────────► user-service
   │                       /api/memories ────────────────────────────► memory-service ─► memory-photos volume
   │                       /api/plans ───────────────────────────────► plan-service
   │                       /* ───────────────────────────────────────► frontend (static)
   └──► keycloak :8181 (demo realm import)                 postgres (user_db, trail_db, memory_db, plan_db, keycloak_db)
```

| Path | Role | Demo only? |
|---|---|---|
| `Project/Backend/<service>/Dockerfile`, `Project/Frontend/Dockerfile` | Application images | No: the images a registry deployment uses |
| `docker-compose.demo.yml` | Wiring and environment for one machine | Yes |
| `edge/nginx.conf` | The Ingress role: one origin, `/api/*` per service | Yes (the same path rules become Ingress rules) |
| `keycloak/realm-outdoor-trip.json` | Demo realm: `outdoor-web` client, demo users, `demo-seeder` client | Yes |
| `mocks/server.py` | Stand-in for OpenAI (and, opt-in, Open-Meteo) | Yes |
| `db/init/` | Creates the empty databases; Flyway in each service creates the schema | Yes |
| `seed/seed.py`, `db/seed/past-plans.sql` | Example data through the product APIs; Past Plans by SQL (the product cannot create a Plan in the past) | Yes |

## Configuration (`.env.demo`)

Created from `.env.demo.example` on the first run. Notable values:

- **Real OpenAI instead of the mock:** `OPENAI_API_KEY=<key>` and `OPENAI_BASE_URL=https://api.openai.com/v1`, then `scripts/demo-up.sh`.
- **Offline weather:** `WEATHER_BASE_URL=http://external-mocks:8090` gives deterministic sample forecasts instead of real Open-Meteo data.
- **Ports:** `DEMO_WEB_PORT`, `DEMO_KEYCLOAK_PORT`. The realm import reads them only on a fresh demo volume, so change them before the first start or after `--reset`.

About the planner mock: it reads difficulty, duration, distance, elevation, scenery, and "no preference" answers with keyword rules that follow the application's extraction prompt. It is less flexible than the real model with unusual phrasing; the rest of the planner (merging, questions, constraints, scoring, weather) is the real code.

## Troubleshooting

- `docker compose --env-file deploy/local-demo/.env.demo -f deploy/local-demo/docker-compose.demo.yml ps` shows each service's health; `... logs <service>` its log.
- **Sign-in is unavailable / redirect error:** the ports changed after the realm was imported. Run `scripts/demo-down.sh --reset`, then start again.
- **Port in use:** change `DEMO_WEB_PORT` / `DEMO_KEYCLOAK_PORT` (see above).
- **Apple Silicon:** the PostGIS image runs under emulation; the first start is slower.
