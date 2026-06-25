#!/bin/bash
set -e

echo " Waiting for PostgreSQL to be ready..."
# Simple wait loop for Postgres
until python3 -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" 2>/dev/null; do
  sleep 1
done

echo " Database is up. Running seeding script..."
python3 seed_realistic_data.py

echo " Starting FastAPI Server..."
exec uvicorn backend.app:app --host 0.0.0.0 --port 8000
