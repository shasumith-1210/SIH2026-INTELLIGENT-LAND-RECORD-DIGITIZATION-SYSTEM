#!/usr/bin/env bash
# Starts a throwaway backend, seeds it, runs the UI integration tests against it, then stops it.
set -e
cd "$(dirname "$0")/.."
if curl -sf localhost:8765/health >/dev/null; then echo "port 8765 already in use"; exit 1; fi
export JWT_SECRET=ui-test-secret DEV_OTP_LOG=1 DATABASE_URL=sqlite:////tmp/il_ui.db STORAGE_DIR=/tmp/il_ui_storage OTP_LOG=/tmp/il_ui_api.log CORS_ORIGINS="*"
export IL_PASS=Test-pass-123
export USERS_JSON='[{"username":"officer1","password":"Test-pass-123","role":"officer"},{"username":"admin1","password":"Test-pass-123","role":"admin"}]'
rm -rf /tmp/il_ui.db /tmp/il_ui_storage /tmp/il_ui_api.log
pushd backend >/dev/null
nohup python3 -m uvicorn app.main:app --port 8765 > /tmp/il_ui_api.log 2>&1 &
echo $! > /tmp/il_ui_api.pid
popd >/dev/null
trap 'kill $(cat /tmp/il_ui_api.pid) 2>/dev/null || true; sleep 2' EXIT
for i in $(seq 1 30); do curl -sf localhost:8765/health >/dev/null && break; sleep 0.5; done
SEED=$(cd backend && API=http://localhost:8765 python3 -m eval.seed_for_ui_tests 9811111111)
echo "seeded: $SEED"
export IL_DOC=$(echo "$SEED" | python3 -c "import sys,json;print(json.load(sys.stdin)['doc'])") IL_PHONE=9811111111 IL_OFFICER_USER=officer1 IL_ADMIN_USER=admin1
(cd frontend && VITE_API_BASE=http://localhost:8765 npx vitest run)
