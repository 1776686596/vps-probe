#!/usr/bin/env bash
set -euo pipefail

# VPS Probe - One-click deploy to Cloudflare
# Usage: ./deploy.sh

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║       VPS Probe - Quick Deploy        ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Check wrangler login
if ! npx wrangler whoami &>/dev/null; then
  info "Please login to Cloudflare first..."
  npx wrangler login
fi

cd "$(dirname "$0")"

# Generate HMAC secret
HMAC_SECRET=$(openssl rand -hex 32)
log "Generated HMAC secret"

# Create D1 database
info "Creating D1 database..."
D1_OUTPUT=$(npx wrangler d1 create vps-probe 2>&1 || true)
if echo "$D1_OUTPUT" | grep -q "already exists"; then
  D1_ID=$(npx wrangler d1 list --json 2>/dev/null | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4)
else
  D1_ID=$(echo "$D1_OUTPUT" | grep "database_id" | awk '{print $3}')
fi
log "D1 database ready: $D1_ID"

# Create KV namespace
info "Creating KV namespace..."
KV_OUTPUT=$(npx wrangler kv:namespace create STATUS_KV 2>&1 || true)
if echo "$KV_OUTPUT" | grep -q "already exists"; then
  KV_ID=$(npx wrangler kv:namespace list --json 2>/dev/null | grep -B1 "vps-probe-STATUS_KV" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
else
  KV_ID=$(echo "$KV_OUTPUT" | grep 'id = "' | grep -o '"[^"]*"' | tr -d '"')
fi
log "KV namespace ready: $KV_ID"

# Update wrangler.toml
cat > server/wrangler.toml << EOF
name = "vps-probe"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
PROBE_STATUS_TTL_SECONDS = "120"

[[d1_databases]]
binding = "DB"
database_name = "vps-probe"
database_id = "$D1_ID"

[[kv_namespaces]]
binding = "STATUS_KV"
id = "$KV_ID"
EOF
log "Updated wrangler.toml"

# Install server dependencies
info "Installing dependencies..."
cd server && npm install --silent

# Initialize database
info "Initializing database..."
npx wrangler d1 execute vps-probe --remote --file=./schema.sql --yes &>/dev/null || true
log "Database initialized"

# Set secret and deploy
info "Deploying API..."
echo "$HMAC_SECRET" | npx wrangler secret put PROBE_HMAC_SECRET --yes &>/dev/null
npx wrangler deploy --yes &>/dev/null
API_URL=$(npx wrangler deploy --dry-run 2>&1 | grep -o 'https://[^"]*workers.dev' | head -1 || echo "https://vps-probe.$(npx wrangler whoami 2>/dev/null | grep -o '[^ ]*@[^ ]*' | cut -d@ -f1).workers.dev")
log "API deployed"

# Build and deploy dashboard
cd ../dashboard
info "Building dashboard..."
npm install --silent
VITE_API_URL="${API_URL}/v1" npm run build &>/dev/null

info "Deploying dashboard..."
npx wrangler pages project create vps-probe-dashboard --production-branch main &>/dev/null || true
PAGES_URL=$(npx wrangler pages deploy dist --project-name vps-probe-dashboard --commit-dirty=true 2>&1 | grep -o 'https://[^ ]*pages.dev' | tail -1)
log "Dashboard deployed"

# Done
echo ""
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                    Deploy Complete!                       ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}Dashboard:${NC}  $PAGES_URL"
echo -e "  ${GREEN}API:${NC}        $API_URL"
echo ""
echo -e "  ${BLUE}HMAC Secret (save this!):${NC}"
echo "  $HMAC_SECRET"
echo ""
echo "  ─────────────────────────────────────────────────────────────"
echo "  Install agent on your VPS:"
echo ""
echo -e "  ${GREEN}curl -fsSL https://raw.githubusercontent.com/1776686596/vps-probe/main/install.sh | sudo bash -s -- \\\\${NC}"
echo -e "  ${GREEN}  --url ${API_URL}/v1/ingest \\\\${NC}"
echo -e "  ${GREEN}  --secret $HMAC_SECRET${NC}"
echo ""
