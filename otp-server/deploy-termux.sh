#!/usr/bin/env bash
# ============================================================
# BƯỚC 5 (ĐÃ SỬA): KHÔNG dùng "npm install -g convex" nữa.
# Dùng npx convex ngay trong thư mục này -> không lỗi quyền Termux.
# Chạy:  bash deploy-termux.sh
# ============================================================
set -e
set -o pipefail
cd "$(dirname "$0")"

echo ""
echo "==> [1/3] Cai goi (npm install) ..."
npm install

echo ""
echo "==> [2/3] Dang nhap Convex ..."
echo "    Neu khong tu mo trinh duyet: COPY link hien ra -> mo bang Chrome -> dan ma."
npx convex login

echo ""
echo "==> [3/3] Deploy len production ..."
echo "    Lan dau se hoi ten project / team -> go theo huong dan tren man hinh."
npx convex deploy 2>&1 | tee deploy.log

echo ""
echo "==> Cap nhat CONVEX_URL vao index.html ..."
bash ./cap-nhat-url.sh

echo ""
echo "XONG. Con 1 viec: day index.html (trong thu muc nay) len GitHub Pages."
echo "Ghi chu: hay mo README_TERMUX.md de xem lenh copy-paste."
