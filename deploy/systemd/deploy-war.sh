#!/usr/bin/env bash
set -euo pipefail

# Optional override:
#   APP_ROOT=/home/laeti/mobinogi /home/laeti/mobinogi/scripts/deploy-war.sh
APP_ROOT="${APP_ROOT:-/home/laeti/mobinogi}"
TARGET_DIR="${APP_ROOT}/target"
LOCK_FILE="/tmp/mobinogi-war-deploy.lock"

if [[ ! -d "${APP_ROOT}" ]]; then
	echo "[deploy-war] APP_ROOT not found: ${APP_ROOT}" >&2
	exit 1
fi

if [[ ! -d "${TARGET_DIR}" ]]; then
	echo "[deploy-war] TARGET_DIR not found: ${TARGET_DIR}" >&2
	exit 1
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
	echo "[deploy-war] another deploy is running, skipping"
	exit 0
fi

mapfile -t WAR_FILES < <(
	find "${TARGET_DIR}" -maxdepth 1 -type f -name "*.war" ! -name "*.war.original" \
		-printf "%T@ %p\n" | sort -nr | awk '{print $2}'
)

if [[ "${#WAR_FILES[@]}" -eq 0 ]]; then
	echo "[deploy-war] no .war files found in ${TARGET_DIR}"
	exit 0
fi

LATEST_WAR="${WAR_FILES[0]}"

# Dockerfile uses COPY target/*.war, so keep exactly one WAR.
for WAR in "${WAR_FILES[@]:1}"; do
	rm -f -- "${WAR}"
done

# Wait until upload/copy is stable.
PREV_SIZE="-1"
for _ in {1..8}; do
	CUR_SIZE="$(stat -c %s "${LATEST_WAR}" 2>/dev/null || echo 0)"
	if [[ "${CUR_SIZE}" -gt 0 && "${CUR_SIZE}" == "${PREV_SIZE}" ]]; then
		break
	fi
	PREV_SIZE="${CUR_SIZE}"
	sleep 2
done

if [[ ! -s "${LATEST_WAR}" ]]; then
	echo "[deploy-war] WAR file is empty or unreadable: ${LATEST_WAR}" >&2
	exit 1
fi

cd "${APP_ROOT}"
echo "[deploy-war] deploying ${LATEST_WAR}"
docker compose up -d --build app

# Keep disk usage bounded.
docker image prune -f >/dev/null 2>&1 || true
echo "[deploy-war] done"
