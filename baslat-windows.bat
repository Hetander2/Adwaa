@echo off
chcp 65001 > nul
title Adwaa Travel Panel
echo.
echo === Adwaa Travel Panel baslatiliyor ===
echo.
echo Bu pencereyi KAPATMAYIN - panel bu pencere acikken calisir.
echo Durdurmak icin bu pencereyi kapatabilir ya da Ctrl+C basabilirsiniz.
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo HATA: Node.js bulunamadi.
  echo Once https://nodejs.org adresinden Node.js'i kurun, sonra bu dosyayi tekrar calistirin.
  pause
  exit /b 1
)

node server.js
pause
