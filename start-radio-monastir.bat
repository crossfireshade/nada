@echo off
title Radio Monastir - Demarrage

:: ── Elevation automatique (UAC) ──────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Demande des droits administrateur pour MongoDB...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: ── Tuer les anciens process Node si present ──────────────────────────────────
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %errorLevel% equ 0 (
    echo Arret des anciens process Node.js...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: ── MongoDB ───────────────────────────────────────────────────────────────────
echo.
echo [1/3] Demarrage de MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>nul | find /I "mongod.exe" >nul
if %errorLevel% equ 0 (
    echo      MongoDB est deja en cours d'execution.
) else (
    start "" /B "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" ^
        --dbpath "C:\Program Files\MongoDB\Server\7.0\data" ^
        --port 27017 ^
        --bind_ip 127.0.0.1 ^
        --logpath "C:\Users\LENOVO\AppData\Local\Temp\mongod.log" ^
        --logappend
    echo      Attente du demarrage de MongoDB...
    timeout /t 5 /nobreak >nul
)

:: ── Serveur Node.js ───────────────────────────────────────────────────────────
echo [2/3] Demarrage du serveur Node.js (port 5000)...
start "Radio Monastir - Serveur" cmd /k "cd /d C:\Users\LENOVO\radio_monastir\server && npm start"
timeout /t 4 /nobreak >nul

:: ── Client Vite ───────────────────────────────────────────────────────────────
echo [3/3] Demarrage du client React...
start "Radio Monastir - Client" cmd /k "cd /d C:\Users\LENOVO\radio_monastir\client && npm run dev"
timeout /t 4 /nobreak >nul

:: ── Ouvrir le navigateur ─────────────────────────────────────────────────────
echo Ouverture du navigateur...
start "" "http://localhost:4173"

:: ── Résumé ────────────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo  Tous les services sont lances !
echo ============================================================
echo  MongoDB  : mongodb://localhost:27017
echo  Serveur  : http://localhost:5000
echo  Client   : http://localhost:4173  (ouvre dans le navigateur)
echo ============================================================
echo.
echo Cette fenetre peut etre fermee.
pause
