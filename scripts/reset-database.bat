@echo off
echo.
echo ========================================
echo    SuperOAuth Database Reset Tool
echo ========================================
echo.
echo Ce script va vider toutes les donnees utilisateurs
echo de la base de donnees SuperOAuth.
echo.
echo ATTENTION: Cette action est irreversible !
echo.

set /p confirm="Voulez-vous vraiment continuer ? (oui/non): "

if /i "%confirm%"=="oui" goto :reset
if /i "%confirm%"=="o" goto :reset
if /i "%confirm%"=="yes" goto :reset
if /i "%confirm%"=="y" goto :reset

echo.
echo Operation annulee.
pause
exit /b 0

:reset
echo.
echo Execution du script de reset...
echo.

npm run db:reset-force

echo.
echo Termine ! Appuyez sur une touche pour fermer...
pause
