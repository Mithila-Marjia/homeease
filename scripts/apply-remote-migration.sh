#!/usr/bin/env bash
# Apply supabase/migrations/*.sql to your hosted Supabase project (one-time, or when you add migrations).
#
# 1) In Supabase Dashboard: Project Settings → Database → copy your database password
#    (or reset it if you don’t have it).
# 2) From the homeease folder, run:
#      export SUPABASE_DB_PASSWORD='your-database-password'
#      ./scripts/apply-remote-migration.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${SUPABASE_PROJECT_REF:-tyenaomoleylimewvlrn}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD to your Supabase database password, then re-run."
  echo "Dashboard: Project Settings → Database → Database password."
  exit 1
fi

echo "Linking project ref: $REF"
supabase link --project-ref "$REF" --password "$SUPABASE_DB_PASSWORD" --yes

echo "Pushing migrations to remote..."
supabase db push

echo "Done. Verify in Supabase → Table Editor (profiles, categories, services, …)."
