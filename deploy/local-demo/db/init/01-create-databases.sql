-- Local Demo only: runs once, on a fresh demo volume. Creates empty databases;
-- each service's own Flyway migrations create its schema at startup, exactly
-- as against a managed database (RDS). No data here.
CREATE DATABASE user_db;
CREATE DATABASE trail_db;
CREATE DATABASE memory_db;
CREATE DATABASE plan_db;
CREATE DATABASE keycloak_db;
