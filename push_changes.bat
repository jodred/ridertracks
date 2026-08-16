@echo off
cd /d c:\Users\John\ridertracks
git add public/favicon.svg src/routes/__root.tsx
git commit -m "Replace Lovable favicon with RideTracks svg icon"
git push origin main
pause
