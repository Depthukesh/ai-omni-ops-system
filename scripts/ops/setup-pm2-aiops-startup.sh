#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-aiops}"
APP_HOME="${APP_HOME:-/home/${APP_USER}}"
SERVICE_NAME="pm2-${APP_USER}"
PM2_BIN="${PM2_BIN:-$(command -v pm2 || true)}"

if [[ "$(id -u)" != "0" ]]; then
  echo "请用 root 执行这个脚本。"
  exit 1
fi

if [[ -z "${PM2_BIN}" ]]; then
  echo "未找到 pm2，请先确认 pm2 已安装。"
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "系统中不存在用户 ${APP_USER}。"
  exit 1
fi

mkdir -p /etc/systemd/system

cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=PM2 process manager for ${APP_USER}
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=${APP_USER}
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PM2_HOME=${APP_HOME}/.pm2
PIDFile=${APP_HOME}/.pm2/pm2.pid
ExecStart=${PM2_BIN} resurrect
ExecReload=${PM2_BIN} reload all
ExecStop=${PM2_BIN} kill
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo -u "${APP_USER}" -H "${PM2_BIN}" save
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager
