#!/usr/bin/env bash
# Build step for PR previews, run by `convex deploy --cmd`.
#
# convex deploy sets VITE_CONVEX_URL to this PR's own preview deployment. The
# Worker proxies /feed/* to the matching .convex.site origin, so record that
# origin for the wrangler upload step instead of using the shared development
# value baked into wrangler.dev.jsonc.
set -euo pipefail

: "${VITE_CONVEX_URL:?VITE_CONVEX_URL must be set by convex deploy --cmd-url-env-var-name}"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "CONVEX_SITE_URL=${VITE_CONVEX_URL%.convex.cloud}.convex.site" >>"$GITHUB_ENV"
fi

bun run build
