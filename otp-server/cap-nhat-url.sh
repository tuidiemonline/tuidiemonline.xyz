#!/usr/bin/env bash
# Tu lay URL deployment tu deploy.log (hoac .env.local) roi sua 1 dong
# window.CONVEX_URL trong index.html. Chay rieng: bash cap-nhat-url.sh
set -e
cd "$(dirname "$0")"

URL=""
if [ -f deploy.log ]; then
  URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.convex\.cloud' deploy.log | tail -n 1 || true)
fi

if [ -z "$URL" ] && [ -f .env.local ]; then
  D=$(grep -E '^CONVEX_DEPLOYMENT=' .env.local | tail -n 1 | cut -d= -f2- | tr -d '"' | sed 's/^dev://; s/^prod://' || true)
  [ -n "$D" ] && URL="https://${D}.convex.cloud"
fi

if [ -z "$URL" ]; then
  echo "Khong tim duoc URL tu dong."
  echo "Mo Convex Dashboard -> Settings -> URL, roi sua tay dong nay trong index.html:"
  echo "  window.CONVEX_URL = 'https://ten-cua-ban.convex.cloud';"
  exit 1
fi

sed -i "s|window.CONVEX_URL = '[^']*'|window.CONVEX_URL = '$URL'|" index.html
echo "Da gan: $URL"
echo "Kiem tra: grep -n CONVEX_URL index.html | head -1"
