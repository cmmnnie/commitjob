@echo off
chcp 65001 > nul
echo ============================================================
echo 채용공고 삽입 프로그램
echo ============================================================
echo.

if "%~1"=="" (
    echo 사용법: insert_job.bat ^<채용공고_URL^>
    echo.
    echo 예시:
    echo   insert_job.bat https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567
    echo.
    pause
    exit /b 1
)

cd /d C:\AI\mini\project\backend\catch-scraper-service

python insert_job.py %1

pause
