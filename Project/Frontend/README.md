# Outdoor Trip Companion — Frontend

A demo-ready React + TypeScript interface for planning, packing, exploring, and remembering outdoor trips around Vancouver.

## Run the demo

Start the supporting services first:

- Keycloak: `http://localhost:8180`
- User Service: `http://localhost:8081`
- Trail Service (when available): `http://localhost:8082`

Then run:

```bash
cd Project/Frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Keycloak redirects unauthenticated visitors to the `outdoor-trip` realm using Authorization Code Flow + PKCE.

Unauthenticated visitors see a welcome screen with three choices: Keycloak login, Keycloak registration, or guest mode. Guest mode can use the Home prototype and browse demo trail experiences but never calls authenticated User Service endpoints; Pack and Profile display a sign-in prompt.

Home is the default route and the future entry point for the AI hiking assistant. The conversational UI is implemented through reusable `ChatComposer`, `ChatMessage`, `SuggestionPrompt`, and `TrailResultCard` components. `src/services/aiService.ts` defines the future integration boundary, but no AI endpoint is invented or called yet. Submitted messages receive an explicit prototype notice instead of a fabricated AI answer.

The primary navigation includes Home, Plan, Pack, Explore, and Memory. Home remains the default route.

> Keycloak realm user registration must be enabled for the **Create account** button to open the registration form.

The Vite development server proxies `/user-api` and `/trail-api` to the local services. This avoids browser CORS issues without requiring backend changes. All targets remain configurable in `.env`.

## Data sources

- **Real APIs:** profile and all Gear CRUD operations use the User Service with the current Keycloak bearer token.
- **Temporary demo data:** Dashboard weather/upcoming trip, Memory history, and simulated community activity are visibly marked as demo concepts.
- **Trails:** the current Trail Service has no controllers or DTOs, so the default `VITE_TRAIL_DATA_MODE=demo` uses isolated data from `src/data/mockTrails.ts`. No API failure ever triggers a mock fallback. Once the Trail Service contract is implemented, set `VITE_TRAIL_DATA_MODE=api` and align DTO mapping/query names only in `src/services/trailService.ts` if necessary.
- **Memory uploads:** selected photos and GPX filenames are local browser previews only and are not persisted.

## Checks

```bash
npm run lint
npm run build
```
