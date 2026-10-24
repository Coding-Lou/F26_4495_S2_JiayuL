-- Local Demo only, never a Flyway migration. Run by scripts/demo-up.sh after
-- plan-service has migrated plan_db.
--
-- The product only creates Plans for today or later (Finish preparation), so
-- a Plan becomes Past only with the passage of time. To show the Plan ->
-- Memory bridge on the first day, this inserts two Past Plans for the demo
-- user directly. Fixed ids make it run once: a Plan the evaluator deletes is
-- soft-deleted, keeps its id, and is not inserted again.
--
--   Quarry Rock, 10 days ago: seed.py adds a matching Memory -> "View memory"
--   Grouse Grind, 20 days ago: no Memory                    -> "Add memory"
--
-- Variable: owner_subject (the demo user's Keycloak id, DEMO_USER_ID).

INSERT INTO plans (id, owner_subject, trail_id, trip_date, status)
VALUES
    ('d3e00000-0000-4000-8000-000000000001', :'owner_subject',
     '11111111-1111-1111-1111-111111111111', CURRENT_DATE - 10, 'READY'),
    ('d3e00000-0000-4000-8000-000000000002', :'owner_subject',
     '22222222-2222-2222-2222-222222222222', CURRENT_DATE - 20, 'READY')
ON CONFLICT DO NOTHING;
