#!/bin/bash
# Adwaa Travel Panel - başlatma betiği (macOS / Linux)
cd "$(dirname "$0")"

echo ""
echo "=== Adwaa Travel Panel başlatılıyor ==="
echo ""
echo "Bu pencereyi KAPATMAYIN - panel bu pencere açıkken çalışır."
echo "Durdurmak için Ctrl+C basın."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "HATA: Node.js bulunamadı."
  echo "Önce https://nodejs.org adresinden Node.js'i kurun, sonra bu dosyayı tekrar çalıştırın."
  read -p "Devam etmek için Enter'a basın..."
  exit 1
fi

node server.js
