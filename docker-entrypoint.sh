#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
node dist/db/migrate.js

echo "Starting server..."
exec node dist/server.js
