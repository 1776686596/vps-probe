#!/usr/bin/env bash
set -euo pipefail

# VPS Probe Agent Installer
# Usage: curl -fsSL https://your-domain.com/install.sh | bash -s -- --url URL --secret SECRET

BIN_NAME="vps-probe-agent"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/vps-probe"
STATE_DIR="/var/lib/vps-probe"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[vps-probe]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1" >&2; exit 1; }

# Parse arguments
PROBE_SERVER_URL=""
PROBE_HMAC_SECRET=""
PROBE_NODE_ID=""
PROBE_INTERVAL="10"
DOWNLOAD_URL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --url) PROBE_SERVER_URL="$2"; shift 2 ;;
    --secret) PROBE_HMAC_SECRET="$2"; shift 2 ;;
    --node-id) PROBE_NODE_ID="$2"; shift 2 ;;
    --interval) PROBE_INTERVAL="$2"; shift 2 ;;
    --download) DOWNLOAD_URL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Validate required params
[[ -z "$PROBE_SERVER_URL" ]] && err "Missing --url (API endpoint, e.g. https://your-worker.workers.dev/v1/ingest)"
[[ -z "$PROBE_HMAC_SECRET" ]] && err "Missing --secret (HMAC secret)"

# Check root
[[ $(id -u) -ne 0 ]] && err "Please run as root (use sudo)"

# Detect architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux) ;;
  *) err "Unsupported OS: $OS (only Linux supported)" ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) err "Unsupported architecture: $ARCH" ;;
esac

log "Detected: ${OS}/${ARCH}"

# Set node ID
if [[ -z "$PROBE_NODE_ID" ]]; then
  PROBE_NODE_ID=$(hostname)
fi

# Download binary
if [[ -z "$DOWNLOAD_URL" ]]; then
  DOWNLOAD_URL="https://vps-probe-releases.pages.dev/linux/${BIN_NAME}-${ARCH}"
fi

log "Downloading agent from ${DOWNLOAD_URL}..."
TMP=$(mktemp)
trap "rm -f $TMP" EXIT

if command -v curl &>/dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP" || err "Download failed"
elif command -v wget &>/dev/null; then
  wget -qO "$TMP" "$DOWNLOAD_URL" || err "Download failed"
else
  err "curl or wget required"
fi

# Install binary
install -m 0755 "$TMP" "${INSTALL_DIR}/${BIN_NAME}"
log "Installed binary to ${INSTALL_DIR}/${BIN_NAME}"

# Create directories
mkdir -p "$CONFIG_DIR" "$STATE_DIR"

# Write config
cat > "${CONFIG_DIR}/env" <<EOF
PROBE_SERVER_URL=${PROBE_SERVER_URL}
PROBE_HMAC_SECRET=${PROBE_HMAC_SECRET}
PROBE_NODE_ID=${PROBE_NODE_ID}
PROBE_INTERVAL_SECONDS=${PROBE_INTERVAL}
PROBE_STATE_PATH=${STATE_DIR}/state.json
EOF
chmod 600 "${CONFIG_DIR}/env"
log "Config written to ${CONFIG_DIR}/env"

# Create systemd service
cat > /etc/systemd/system/vps-probe-agent.service <<EOF
[Unit]
Description=VPS Probe Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=${CONFIG_DIR}/env
ExecStart=${INSTALL_DIR}/${BIN_NAME}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable --now vps-probe-agent.service

log "Service started!"
log ""
log "Commands:"
log "  Status:  systemctl status vps-probe-agent"
log "  Logs:    journalctl -u vps-probe-agent -f"
log "  Stop:    systemctl stop vps-probe-agent"
log "  Remove:  systemctl disable vps-probe-agent && rm ${INSTALL_DIR}/${BIN_NAME}"
