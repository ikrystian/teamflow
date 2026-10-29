-- Rola aplikacji: bez SUPERUSER i BYPASSRLS, żeby Row Level Security działało.
-- Migracje uruchamia właściciel (POSTGRES_USER), aplikacja łączy się jako nexus_app.
CREATE ROLE nexus_app LOGIN PASSWORD 'nexus_app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
-- Baza testowa dla testów integracyjnych i e2e.
CREATE DATABASE nexus_test OWNER nexus;
