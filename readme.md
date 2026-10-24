# F26_4495_S2_JiayuL

## Cloud-Native Distributed Invoice Processing Platform

**Student:** Jiayu Lou \
**Student ID:** 300398003 \
**Course:** CSIS 4495 \
**Section:** Section 2 \
**Instructor:** Padmapriya Arasanipalai Kandhadai \
**Team Lead:** Jiayu Lou — Individual Project \
**Date:** September 2026

---

## Quick Demo

### Requirements

- Git
- Docker Desktop

### Start the complete application

```bash
git clone <repository-url>
cd <repository>
./scripts/demo-up.sh
```

Application     http://localhost:3000
Demo accounts   demo / demo-password   (example gear, Plans, Memories)
demo2 / demo-password  (empty account)
or create a new account from the sign-in page
Keycloak admin  http://localhost:8181/admin  (admin / admin-demo)

## 5. Work Date / Hours Log

**Student Name:** Jiayu Lou

The work log will be updated regularly throughout the project. Each entry will record the actual work completed on that day, together with the time spent and the related project output.

| Date | Number of Hours | Description of Work Done |
|---|---:|---|
| Sep. 22, 2026 | 1 | Reviewed the original invoice project idea and adjusted the project scope. |
| Sep. 22, 2026 | 3 | Worked on the first proposal draft, including the project idea, research questions, architecture, technologies, and evaluation plan. |
| Sep. 23, 2026 | 2 | Discussed the project with the professor and decided to reconsider the original invoice project direction. |
| Sep. 25, 2026 | 3 | Defined the new outdoor trip companion project with Plan, Pack, Explore, and Memory features. Continued writing the proposal. |
| Sep. 26, 2026 | 2 | Set up the backend microservice project structure and local PostgreSQL/PostGIS database using Docker. |
| Sep. 26, 2026 | 2 | Started the User Service implementation, including database migration, user entity, repository, and user profile storage. |
| Sep. 26, 2026 | 1 | Researched Keycloak and set up basic authentication with React and Spring Security. |
| Sep. 26, 2026 | 0.5 | Set up Keycloak with a new realm, React client, PKCE login flow, and test user account. |
| Sep. 26, 2026 | 0.5 | Connected Keycloak authentication with the User Service using Spring Security and JWT validation. Tested protected APIs and automatic user profile creation. |
| Sep. 28, 2026 | 1.5 | Worked on the Gear feature and added APIs to create, view, update, and delete gear items. |
| Sep. 28, 2026 | 0.5 | Added soft delete and made sure users can only manage their own gear. |
| Sep. 28, 2026 | 1 | Improved error handling for invalid requests, authentication, and missing gear items. |
| Sep. 28, 2026 | 1.5 | Added tests for the Gear feature and used Testcontainers with PostgreSQL for integration testing. |
| Sep. 28, 2026 | 0.5 | Fixed some testing issues and checked that all User Service tests passed. |
| Oct. 07, 2026 | 5.5 | Implement trail entity, PostGIS-backed nearby search, filtering, GeoJSON trail details, JWT security, CORS configuration, and demo trail seed data. |
| Oct. 10, 2026 | 3.5 | Implemented a context-aware trail recommendation flow that ranks the top three nearby trails using user intent, weather, gear readiness, scenery preferences, and proximity.|
| Oct. 11, 2026 | 3 | Completed **FEATURE-001 – Public Landing**, building the cinematic landing page with three outdoor video scenes, poster fallbacks, responsive layout, and sequential media loading. |
| Oct. 12, 2026 | 4 | Completed **FEATURE-002 – Authentication**, integrating Keycloak login and registration with PKCE, protected routes, session restoration, logout, and a customized Keycloak login theme. |
| Oct. 13, 2026 | 7 | Completed **FEATURE-003 – Conversational Planner**, implementing the multi-turn AI trail planning flow, preference extraction, no-preference handling, duration modes, trail scoring, weather integration, and recommendation testing. |
| Oct. 14, 2026 | 4 | Completed **FEATURE-004 – Trail Selection & Trip Preparation**, adding Trail Detail, trail selection, preparation recommendations, recommended/owned/missing gear states, and Gear Readiness calculation. |
| Oct. 15, 2026 | 6 | Completed **FEATURE-005 – Pack Customization & 3D Avatar**, building the Gear Studio, connecting equipped gear to a real-time Three.js avatar, creating 3D gear assets, and supporting one equipped item per visual category. |
| Oct. 15, 2026 | 6 | Completed **FEATURE-006 – Public Discover & Trail Activity**, building the MapLibre trail discovery experience with viewport-based nearby search, clustering, trail selection, trail-name search, URL state, and curated/synthetic trail handling. |
| Oct. 16, 2026 | 3.5 | Completed **FEATURE-007 – Gear Inventory**, creating the authenticated My Gear page with add, edit, view, and soft-delete operations using the same persistent gear inventory as Gear Studio. |
| Oct. 16, 2026 | 5 | Completed **FEATURE-008 – Memory Foundation**, creating the Memory Service, PostgreSQL persistence, private/public visibility, owner isolation, photo upload validation, signed photo URLs, soft deletion, and backend integration tests. |
| Oct. 17, 2026 | 5 | Completed **FEATURE-009 – My Memories**, building the authenticated Memory list, create, detail, edit, delete, photo upload/reordering, visibility controls, signed-image refresh, and cross-user cache isolation. |
| Oct. 18, 2026 | 4 | Completed **FEATURE-010 – Community Memories**, adding public trail-level Memory previews and browsing in Discover, including public Memory lists, detail views, pagination, responsive panels, and private/public visibility enforcement. |
| Oct. 19, 2026 | 4.5 | Completed **FEATURE-011 – Plan Foundation & Finish Preparation**, creating the Plan Service and `plan_db`, adding authenticated Plan persistence, soft delete, duplicate protection, owner isolation, and the Finish Preparation workflow in Gear Studio. |
| Oct. 20, 2026 | 5.5 | Completed **FEATURE-012 – Ready-to-Go 3D Completion**, creating a versioned avatar asset with a four-second `ready_to_go` animation, integrating it after successful Plan saves, preserving equipped gear, and adding reduced-motion and animation-failure fallbacks. |
| Oct. 20, 2026 | 6 | Completed **FEATURE-013 – My Plans & Calendar**, building the authenticated `/plans` page with Upcoming/Past Plan lists, monthly calendar, Plan-to-calendar selection, trail details, Review Gear, Plan deletion, pagination handling, account isolation, and the Ready-to-Go → My Plans flow. |
| Oct. 21, 2026 | 4 | Study and learn how to compose a Docker setup for the microservice. |