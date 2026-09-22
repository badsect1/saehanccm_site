@echo off
chcp 65001 > nul
cd /d "C:\antigravity\site\saehanccm.com"
echo ======================================================== >> daily_run.log
echo [%date% %time%] 매일 아침 08:30 자동 포스팅 및 배포 시작 >> daily_run.log
echo ======================================================== >> daily_run.log
call npm run post:deploy >> daily_run.log 2>&1
echo [%date% %time%] 작업 완료 >> daily_run.log
