#!/usr/bin/env bash
# Starts a disposable local PostgreSQL for development when you do not have a
# managed database (or Docker) handy. Data lives in .devdb/ (git-ignored).
#
# Usage:  ./scripts/dev-postgres.sh            # port 5432, db "docket" + "docket_test"
#         PGPORT=5544 ./scripts/dev-postgres.sh
#
# Linux x64 only: if `pg_ctl` is not on PATH it installs the npm-packaged
# Postgres binaries with `npm i --no-save` (no package.json changes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PGPORT:-5432}"
DATA_DIR="${PGDATA_DEV:-$ROOT/.devdb/data}"
LOG_FILE="$ROOT/.devdb/postgres.log"

mkdir -p "$(dirname "$DATA_DIR")" "$(dirname "$LOG_FILE")"

if command -v pg_ctl >/dev/null 2>&1; then
  BIN_DIR="$(dirname "$(command -v pg_ctl)")"
else
  BIN_DIR="$ROOT/node_modules/@embedded-postgres/linux-x64/native/bin"
  if [ ! -x "$BIN_DIR/postgres" ]; then
    echo "> installing npm-packaged Postgres binaries (no package.json changes)…"
    npm install --no-save --no-audit --no-fund embedded-postgres@19.0.0-beta.20 >/dev/null
  fi
fi

if [ ! -x "$BIN_DIR/postgres" ]; then
  echo "Could not find Postgres binaries. Install PostgreSQL, or run: npm i --no-save embedded-postgres" >&2
  exit 1
fi

if [ ! -d "$DATA_DIR/base" ]; then
  echo "> initialising cluster in $DATA_DIR"
  "$BIN_DIR/initdb" -D "$DATA_DIR" -U postgres --auth=trust >"$LOG_FILE" 2>&1
fi

if "$BIN_DIR/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
  echo "> Postgres already running on $DATA_DIR"
else
  echo "> starting Postgres on port $PORT"
  "$BIN_DIR/pg_ctl" -D "$DATA_DIR" -o "-p $PORT -k /tmp" -l "$LOG_FILE" start
fi

# Create the app and test databases if they are missing (via the pg driver).
node --input-type=module -e "
import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://postgres@127.0.0.1:${PORT}/postgres' });
await client.connect();
for (const db of ['docket', 'docket_test']) {
  await client.query('CREATE DATABASE ' + db).catch((error) => {
    if (error.code !== '42P04') throw error;
  });
}
await client.end();
console.log('> databases ready: docket, docket_test');
"

cat <<EOF

Local Postgres is up on 127.0.0.1:$PORT (trust auth, user "postgres").

Next:
  export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/docket"
  export DIRECT_URL="\$DATABASE_URL"
  export TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/docket_test"
  npm run db:init && npm run db:seed
EOF
