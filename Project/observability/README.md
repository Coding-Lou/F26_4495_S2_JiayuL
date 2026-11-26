# Activity service dashboard

This is a separate local Prometheus + Grafana stack. It does not change the
team-wide `Project/docker-compose.yml`. It scrapes the activity service's
existing `/actuator/prometheus` endpoint while the service runs on the host
at port 8084.

## Start

1. Start PostgreSQL, Keycloak, the standalone Redis container, and the
   activity service as usual. Check `http://localhost:8084/actuator/prometheus`.
2. From the repository root, run:

   ```sh
   GRAFANA_ADMIN_PASSWORD='choose-a-local-password' docker compose -f Project/observability/compose.yaml up -d
   ```

3. Open `http://127.0.0.1:19090/targets` and confirm `activity-service` is UP.
4. Open `http://127.0.0.1:13000`, sign in as `admin` with your password, and
   choose **Outdoor Trip | Activity Service** from the dashboards list.

The dashboard is empty until the activity service is running and receives
requests. Its join panels use the exact controller route
`POST /api/group-events/{eventId}/registrations`. The latency panel uses
Micrometer histogram buckets from the activity service configuration.

To stop the monitoring stack while retaining its data:

```sh
docker compose -f Project/observability/compose.yaml down
```

## What the charts establish

The panels show scrape reachability, join/cancel HTTP response rates, join
latency P95 and JVM heap usage. A 409 may mean FULL, CLOSED, or another
business rejection, so HTTP status alone is insufficient to identify the
reason. A 204 currently includes repeated cancellations. The dashboard does
not prove no overselling, Redis/Postgres agreement, or high availability.
Keep the Testcontainers assertions and Redis/Postgres state checks alongside
screenshots. Once Step 3 connects the gate to `join`, add bounded-cardinality
business counters for ADMITTED/FULL/DUPLICATE/NOT_READY, guarded undo and
reconciliation backlog. Never label metrics with event IDs or user IDs.

For a portfolio screenshot, capture the test command, load shape, machine
limits, sample size and final database/Redis assertions next to the panels.
The current scripts use a host service on port 8084; adjust the Prometheus
target if the service later runs inside another Compose network.
