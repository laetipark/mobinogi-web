#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${1:-/home/laeti/mobinogi}"
SCRIPT_SRC="${APP_ROOT}/deploy/systemd/deploy-war.sh"
SERVICE_SRC="${APP_ROOT}/deploy/systemd/mobinogi-war-deploy.service"
PATH_SRC="${APP_ROOT}/deploy/systemd/mobinogi-war-deploy.path"

SCRIPT_DST="${APP_ROOT}/scripts/deploy-war.sh"
SERVICE_DST="/etc/systemd/system/mobinogi-war-deploy.service"
PATH_DST="/etc/systemd/system/mobinogi-war-deploy.path"

if [[ ! -f "${SCRIPT_SRC}" || ! -f "${SERVICE_SRC}" || ! -f "${PATH_SRC}" ]]; then
	echo "Required source files not found under ${APP_ROOT}/deploy/systemd" >&2
	exit 1
fi

sudo mkdir -p "${APP_ROOT}/scripts"
sudo cp -f "${SCRIPT_SRC}" "${SCRIPT_DST}"
sudo chmod 755 "${SCRIPT_DST}"

sudo cp -f "${SERVICE_SRC}" "${SERVICE_DST}"
sudo cp -f "${PATH_SRC}" "${PATH_DST}"

sudo systemctl daemon-reload
sudo systemctl enable --now mobinogi-war-deploy.path
sudo systemctl restart mobinogi-war-deploy.path

echo "Installed and started mobinogi-war-deploy.path"
echo "Check status:"
echo "  systemctl status mobinogi-war-deploy.path"
echo "  journalctl -u mobinogi-war-deploy.service -f"
