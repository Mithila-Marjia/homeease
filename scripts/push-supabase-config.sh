#!/usr/bin/env bash
# Push supabase/config.toml to Supabase Cloud (auth, api, etc.).
# Requires: supabase login
# Uses SUPABASE_PROJECT_REF if set, else supabase/.temp/project-ref when present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARGS=(config push --yes)
if [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  ARGS+=(--project-ref "$SUPABASE_PROJECT_REF")
elif [ -f supabase/.temp/project-ref ]; then
  ARGS+=(--project-ref "$(tr -d '[:space:]' < supabase/.temp/project-ref)")
fi

exec supabase "${ARGS[@]}"
