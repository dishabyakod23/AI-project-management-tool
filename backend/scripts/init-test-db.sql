-- Runs automatically on first container start (docker-entrypoint-initdb.d).
-- Creates a second database so pytest can run against a real Postgres
-- instance without touching the dev database.
CREATE DATABASE ai_pm_tool_test OWNER ai_pm_user;
